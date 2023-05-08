use std::convert::TryInto;
use std::future::Future;
use std::marker::Unpin;
use std::path::Path;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use anyhow::{anyhow, Error as AnyError};
use async_compat::CompatExt;
use cookie::Cookie;
use futures::{Stream, TryFutureExt, TryStreamExt};
use generic_array::GenericArray;
use http::response::Builder as ResponseBuilder;
use hyper::{
    body::{Buf, Bytes},
    header::{self, HeaderValue},
    Body, Method, Response, StatusCode, Uri,
};
use lazy_static::lazy_static;
use pwhash::bcrypt;
use sha2::{Digest, Sha256};
use slog::Drain;
use tokio::io::{AsyncWrite, AsyncWriteExt, ReadBuf};
use warp::Filter;
use web_static_pack::{
    hyper_loader::{Responder, ResponderError},
    loader::Loader,
};

const HOUR: Duration = Duration::from_secs(60 * 60);
const DAY: Duration = Duration::from_secs(60 * 60 * 24);

lazy_static! {
    static ref PACK: &'static [u8] = std::include_bytes!("ui.pack");
    static ref LOADER: Loader = Loader::new(&PACK).unwrap();
    static ref RESPONDER: Responder<'static> = Responder::new(&LOADER);
    static ref APP_ID: HeaderValue = "burn-after-reading".parse().unwrap();
    static ref APP_VERSION: HeaderValue = env!("CARGO_PKG_VERSION").parse().unwrap();
    static ref ERROR_PAGE_404: Uri = "/index.html".parse().unwrap();
}

enum Error {
    Status(StatusCode),
    StatusWithMessage(StatusCode, AnyError),
    Unexpected(AnyError),
}
impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            Error::Status(code) => {
                if let Some(reason) = code.canonical_reason() {
                    write!(f, "{}: {}", code, reason)
                } else {
                    write!(f, "{}", code)
                }
            }
            Error::StatusWithMessage(code, msg) => write!(f, "{}: {}", code, msg),
            Error::Unexpected(msg) => write!(f, "{}", msg),
        }
    }
}
impl<E> From<E> for Error
where
    E: Into<AnyError>,
{
    fn from(e: E) -> Self {
        Error::Unexpected(e.into())
    }
}
trait ResultExt<T>: Sized {
    fn with_status(self, status: StatusCode) -> Result<T, Error>;
    fn with_message<E: Into<AnyError>, F: FnOnce() -> E>(self, message: F) -> Result<T, Error>;
}
impl<T> ResultExt<T> for Result<T, Error> {
    fn with_status(self, status: StatusCode) -> Result<T, Error> {
        self.map_err(|e| match e {
            Error::Status(s) => Error::Status(s),
            Error::StatusWithMessage(_, e) => Error::StatusWithMessage(status, e),
            Error::Unexpected(e) => Error::StatusWithMessage(status, e),
        })
    }
    fn with_message<E: Into<AnyError>, F: FnOnce() -> E>(self, message: F) -> Result<T, Error> {
        self.map_err(|e| match e {
            Error::Status(s) => Error::StatusWithMessage(s, message().into()),
            Error::StatusWithMessage(s, e) => {
                Error::StatusWithMessage(s, e.context(message().into()))
            }
            Error::Unexpected(e) => Error::Unexpected(e.context(message().into())),
        })
    }
}
impl<T, E> ResultExt<T> for Result<T, E>
where
    E: Into<AnyError>,
{
    fn with_status(self, status: StatusCode) -> Result<T, Error> {
        self.map_err(|e| Error::StatusWithMessage(status, e.into()))
    }
    fn with_message<E_: Into<AnyError>, F: FnOnce() -> E_>(self, message: F) -> Result<T, Error> {
        self.map_err(|e| Error::Unexpected(e.into().context(message().into())))
    }
}

fn base_res() -> ResponseBuilder {
    Response::builder().header(header::CACHE_CONTROL, "no-store")
}

fn ok() -> ResponseBuilder {
    base_res().status(StatusCode::OK)
}

fn ok_json<T: serde::Serialize>(body: &T) -> Response<Body> {
    match serde_json::to_vec(body) {
        Ok(body) => ok()
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::CONTENT_LENGTH, body.len())
            .body(body.into())
            .unwrap(),
        Err(e) => internal_server_error(e),
    }
}

fn no_content() -> Response<Body> {
    base_res()
        .status(StatusCode::NO_CONTENT)
        .body(Bytes::new().into())
        .unwrap()
}

fn bad_request<E: std::fmt::Display>(e: E) -> Response<Body> {
    base_res()
        .status(StatusCode::BAD_REQUEST)
        .header(header::CONTENT_TYPE, "text/plain")
        .body(format!("{}", e).into())
        .unwrap()
}

fn unauthorized() -> Response<Body> {
    base_res()
        .status(StatusCode::UNAUTHORIZED)
        .body(Bytes::from_static(&[]).into())
        .unwrap()
}

fn not_found() -> Response<Body> {
    base_res()
        .status(StatusCode::NOT_FOUND)
        .body(Bytes::from_static(&[]).into())
        .unwrap()
}

fn method_not_allowed() -> Response<Body> {
    base_res()
        .status(StatusCode::METHOD_NOT_ALLOWED)
        .body(Bytes::from_static(&[]).into())
        .unwrap()
}

fn internal_server_error<E: std::fmt::Display>(e: E) -> Response<Body> {
    base_res()
        .status(StatusCode::INTERNAL_SERVER_ERROR)
        .header(header::CONTENT_TYPE, "text/plain")
        .body(format!("{}", e).into())
        .unwrap()
}

async fn failable<F: FnOnce() -> Fut, Fut: Future<Output = Result<Response<Body>, Error>>>(
    logger: Arc<slog::Logger>,
    context: &'static str,
    f: F,
) -> Result<Response<Body>, warp::Rejection> {
    Ok(match f().await {
        Ok(a) => a,
        Err(Error::Status(s)) => {
            slog::error!(
                logger,
                "ERROR";
                "context" => context,
                "status" => s.as_u16(),
                "reason" => s.canonical_reason(),
            );
            base_res().status(s).body(Bytes::new().into()).unwrap()
        }
        Err(Error::StatusWithMessage(s, e)) => {
            slog::error!(
                logger,
                "ERROR";
                "context" => context,
                "status" => s.as_u16(),
                "reason" => %e,
            );
            base_res()
                .status(s)
                .header(header::CONTENT_TYPE, "text/plain")
                .body(format!("{}", e).into())
                .unwrap()
        }
        Err(Error::Unexpected(e)) => {
            slog::error!(
                logger,
                "ERROR";
                "context" => context,
                "status" => 500,
                "reason" => %e,
            );
            internal_server_error(e)
        }
    })
}

async fn authenticate<T, F: FnOnce(String) -> Fut, Fut: Future<Output = Result<T, Error>>>(
    sesh_tree: sled::Tree,
    session: String,
    f: F,
) -> Result<T, Error> {
    let data = base64::decode(session)
        .with_status(StatusCode::BAD_REQUEST)
        .with_message(|| anyhow!("parsing session cookie"))?;
    let expiration = sesh_tree
        .get(&data)?
        .ok_or(Error::Status(StatusCode::UNAUTHORIZED))?;
    let mut exp = [0; 8];
    exp.clone_from_slice(&expiration);
    if SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        > u64::from_be_bytes(exp)
    {
        sesh_tree.remove(&data)?;
        return Err(Error::StatusWithMessage(
            StatusCode::UNAUTHORIZED,
            anyhow!("session expired"),
        ));
    }
    f(std::str::from_utf8(&data[16..])?.to_owned()).await
}

#[derive(serde::Deserialize)]
struct Login {
    user: String,
    password: String,
}

async fn login(
    pwd_hash: String,
    sesh_tree: sled::Tree,
    login: Login,
) -> Result<Response<Body>, Error> {
    if login.user == "admin" && bcrypt::verify(&login.password, &pwd_hash) {
        let mut session = vec![0; 16];
        rand::RngCore::fill_bytes(&mut rand::thread_rng(), &mut session);
        session.extend_from_slice(login.user.as_bytes());
        let exp = SystemTime::now().duration_since(UNIX_EPOCH)? + (DAY * 7);
        sesh_tree.insert(&session, &u64::to_be_bytes(exp.as_secs()))?;
        let cookie = Cookie::build("session", base64::encode(&session))
            .expires(time::OffsetDateTime::from_unix_timestamp(exp.as_secs() as i64).ok())
            .path("/api")
            .http_only(true)
            .same_site(cookie::SameSite::Strict)
            .finish();
        Ok(base_res()
            .status(StatusCode::NO_CONTENT)
            .header("set-cookie", cookie.to_string())
            .body(Bytes::new().into())
            .unwrap())
    } else {
        Err(Error::Status(StatusCode::UNAUTHORIZED))
    }
}

async fn logout(sesh_tree: sled::Tree, session: String) -> Result<Response<Body>, Error> {
    let data = base64::decode(session)
        .with_status(StatusCode::BAD_REQUEST)
        .with_message(|| anyhow!("parsing session cookie"))?;
    sesh_tree.remove(&data)?;
    sesh_tree.flush_async().await?;
    Ok(no_content())
}

async fn data(
    logger: Arc<slog::Logger>,
    data_tree: sled::Tree,
    content_type_tree: sled::Tree,
    expiration_tree: sled::Tree,
    key: String,
    method: Method,
) -> Result<Response<Body>, Error> {
    match method {
        Method::GET => match (
            data_tree.get(&key)?,
            content_type_tree.get(&key)?,
            expiration_tree.get(&key)?,
        ) {
            (Some(data), Some(content_type), Some(expiration))
                if SystemTime::now()
                    < (UNIX_EPOCH
                        + Duration::from_secs(u64::from_be_bytes(
                            expiration.as_ref().try_into()?,
                        ))) =>
            {
                if data.is_empty() {
                    let mut file = tokio::fs::File::open(Path::new("big").join(&key)).await?;
                    let len = file.metadata().await?.len();
                    let stream: Box<
                        dyn Stream<
                                Item = Result<
                                    Bytes,
                                    Box<dyn std::error::Error + 'static + Sync + Send>,
                                >,
                            >
                            + 'static
                            + Send,
                    > = Box::new(futures::stream::poll_fn(move |cx| {
                        let mut buf_inner = [0; 1 << 20];
                        let mut buf = ReadBuf::new(&mut buf_inner);
                        match tokio::io::AsyncRead::poll_read(
                            std::pin::Pin::new(&mut file),
                            cx,
                            &mut buf,
                        ) {
                            Poll::Ready(Ok(_n)) => {
                                if buf.filled().is_empty() {
                                    Poll::Ready(None)
                                } else {
                                    Poll::Ready(Some(Ok(Bytes::from(buf.filled().to_vec()))))
                                }
                            }
                            Poll::Ready(Err(e)) => {
                                Poll::Ready(Some(Err::<
                                    _,
                                    Box<dyn std::error::Error + 'static + Sync + Send>,
                                >(Box::new(e))))
                            }
                            Poll::Pending => Poll::Pending,
                        }
                    }));
                    slog::info!(
                        logger,
                        "GET";
                        "status" => 200,
                        "key" => key,
                        "content-type" => std::str::from_utf8(content_type.as_ref())?,
                        "content-length" => len,
                    );
                    Ok(ok()
                        .header(header::CONTENT_TYPE, content_type.to_vec())
                        .header(header::CONTENT_LENGTH, len)
                        .body(stream.into())
                        .unwrap())
                } else {
                    slog::info!(
                        logger,
                        "GET";
                        "status" => 200,
                        "key" => key,
                        "content-type" => std::str::from_utf8(content_type.as_ref())?,
                        "content-length" => data.len(),
                    );
                    Ok(ok()
                        .header(header::CONTENT_TYPE, content_type.to_vec())
                        .header(header::CONTENT_LENGTH, data.len())
                        .body(data.to_vec().into())
                        .unwrap())
                }
            }
            _ => {
                slog::info!(
                    logger,
                    "GET";
                    "status" => 404,
                    "key" => key,
                );
                Err(Error::Status(StatusCode::NOT_FOUND))
            }
        },
        Method::DELETE => {
            content_type_tree.remove(&key)?;
            let data = data_tree.remove(&key)?;
            expiration_tree.remove(&key)?;
            let rm = if data.map(|d| d.len()) == Some(0) {
                futures::future::Either::Left(tokio::fs::remove_file(Path::new("big").join(&key)))
            } else {
                futures::future::Either::Right(async { Ok(()) })
            };
            futures::try_join!(
                data_tree.flush_async().map_err(Error::from),
                content_type_tree.flush_async().map_err(Error::from),
                expiration_tree.flush_async().map_err(Error::from),
                rm.map_err(Error::from),
            )?;
            slog::info!(
                logger,
                "DELETE";
                "status" => 200,
                "key" => key,
            );
            Ok(no_content())
        }
        _ => Err(Error::Status(StatusCode::METHOD_NOT_ALLOWED)),
    }
}

async fn new_data_small(
    logger: Arc<slog::Logger>,
    data_tree: sled::Tree,
    content_type_tree: sled::Tree,
    expiration_tree: sled::Tree,
    content_type: String,
    expiration: u64,
    data: Bytes,
) -> Result<String, Error> {
    if data.is_empty() {
        return Err(Error::StatusWithMessage(
            StatusCode::BAD_REQUEST,
            anyhow!("body required"),
        ));
    }
    let mut hasher = Sha256::new();
    hasher.update(&*data);
    let key = base64::encode_config(
        &hasher.finalize(),
        base64::Config::new(base64::CharacterSet::UrlSafe, true),
    );
    data_tree.insert(&key, &*data)?;
    content_type_tree.insert(&key, content_type.as_bytes())?;
    expiration_tree.insert(&key, &u64::to_be_bytes(expiration))?;
    slog::info!(
        logger,
        "CREATE";
        "status" => 200,
        "key" => &key,
        "content-type" => content_type,
        "content-length" => data.len(),
        "expiration" => %time::OffsetDateTime::from_unix_timestamp(expiration as i64)?,
    );
    Ok(key)
}

struct HashWriter<D: Digest, W: AsyncWrite> {
    hasher: D,
    writer: W,
}
impl<D, W> HashWriter<D, W>
where
    D: Digest,
    W: AsyncWrite,
{
    fn new(w: W) -> Self {
        HashWriter {
            hasher: D::new(),
            writer: w,
        }
    }
}
impl<D, W> HashWriter<D, W>
where
    D: Digest,
    W: AsyncWrite + Unpin,
{
    async fn finish(mut self) -> tokio::io::Result<GenericArray<u8, D::OutputSize>> {
        self.writer.flush().await?;
        self.writer.shutdown().await?;
        Ok(self.hasher.finalize())
    }
}
impl<D, W> AsyncWrite for HashWriter<D, W>
where
    D: Digest + Unpin,
    W: AsyncWrite + Unpin,
{
    fn poll_write(
        self: Pin<&mut Self>,
        cx: &mut Context,
        buf: &[u8],
    ) -> Poll<tokio::io::Result<usize>> {
        let s = self.get_mut();
        match AsyncWrite::poll_write(Pin::new(&mut s.writer), cx, buf) {
            Poll::Ready(Ok(n)) => {
                let hasher = &mut s.hasher;
                hasher.update(&buf[0..n]);
                Poll::Ready(Ok(n))
            }
            a => a,
        }
    }

    fn poll_flush(self: Pin<&mut Self>, cx: &mut Context) -> Poll<tokio::io::Result<()>> {
        AsyncWrite::poll_flush(unsafe { self.map_unchecked_mut(|s| &mut s.writer) }, cx)
    }

    fn poll_shutdown(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<tokio::io::Result<()>> {
        AsyncWrite::poll_shutdown(unsafe { self.map_unchecked_mut(|s| &mut s.writer) }, cx)
    }
}

async fn new_data<S: Stream<Item = Result<B, warp::Error>> + Unpin, B: Buf>(
    logger: Arc<slog::Logger>,
    data_tree: sled::Tree,
    content_type_tree: sled::Tree,
    expiration_tree: sled::Tree,
    content_type: String,
    expiration: u64,
    data: S,
) -> Result<String, Error> {
    let tmp = Path::new("tmp");
    tokio::fs::create_dir_all(tmp).await?;
    let mut tmp_file;
    while {
        tmp_file = format!("{}.tmp", rand::RngCore::next_u32(&mut rand::thread_rng()));
        tokio::fs::metadata(tmp.join(&tmp_file)).await.is_ok()
    } {}
    let mut f = HashWriter::<Sha256, _>::new(tokio::fs::File::create(tmp.join(&tmp_file)).await?);
    tokio::io::copy(
        &mut data
            .map_ok(|mut buf| buf.copy_to_bytes(buf.remaining()).to_vec())
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            .into_async_read()
            .compat_mut(),
        &mut f,
    )
    .await?;
    let key = base64::encode_config(
        &f.finish().await?,
        base64::Config::new(base64::CharacterSet::UrlSafe, true),
    );
    let big = Path::new("big");
    tokio::fs::create_dir_all(big).await?;
    tokio::fs::rename(tmp.join(&tmp_file), big.join(&key)).await?;
    let len = tokio::fs::metadata(big.join(&key)).await?.len();
    data_tree.insert(&key, b"")?;
    content_type_tree.insert(&key, content_type.as_bytes())?;
    expiration_tree.insert(&key, &u64::to_be_bytes(expiration))?;
    slog::info!(
        logger,
        "CREATE";
        "status" => 200,
        "key" => &key,
        "content-type" => content_type,
        "content-length" => len,
        "expiration" => %time::OffsetDateTime::from_unix_timestamp(expiration as i64)?,
    );
    Ok(key)
}

#[derive(serde::Serialize)]
struct NewDataRes {
    hash: String,
}

#[tokio::main]
async fn main() -> Result<(), AnyError> {
    let pwd_hash: String;
    if Path::new("pwd.txt").exists() {
        let pwd: String = serde_yaml::from_str(&tokio::fs::read_to_string("pwd.txt").await?)?;
        pwd_hash = bcrypt::hash(&pwd).unwrap();
        tokio::fs::write("pwd-hash.txt", &pwd_hash).await?;
        tokio::fs::remove_file("pwd.txt").await?;
    } else {
        pwd_hash = serde_yaml::from_str(&tokio::fs::read_to_string("pwd-hash.txt").await?)?;
    }
    if let Ok(metadata) = tokio::fs::metadata("tmp").await {
        if metadata.is_dir() {
            tokio::fs::remove_dir_all("tmp").await?;
        } else {
            tokio::fs::remove_file("tmp").await?;
        }
    }

    let decorator = slog_term::TermDecorator::new().stderr().build();
    let drain = slog_term::FullFormat::new(decorator).build().fuse();
    #[cfg(feature = "demo")]
    let drain = slog::Duplicate::new(
        drain,
        slog_bunyan::new(
            tokio::fs::OpenOptions::new()
                .append(true)
                .create(true)
                .open("bunyan.log")
                .await?
                .into_std()
                .await,
        )
        .build(),
    )
    .fuse();
    let drain = slog_async::Async::new(drain)
        .build()
        .filter_level(slog::Level::Info)
        .fuse();
    let logger = Arc::new(slog::Logger::root(drain, slog::o!()));
    let sesh_cleaner_logger = logger.clone();
    let expiration_cleaner_logger = logger.clone();
    let data_logger = logger.clone();
    let new_data_logger = logger.clone();
    let new_data_small_logger = logger.clone();
    let login_logger = logger.clone();
    let logout_logger = logger.clone();

    let db = sled::open("burn-after-reading.db")?;

    let sesh_tree = db.open_tree("sessions")?;
    let sesh_tree_data = sesh_tree.clone();
    let sesh_tree_data_small = sesh_tree.clone();
    let sesh_tree_login = sesh_tree.clone();
    let sesh_tree_cleaner = sesh_tree.clone();
    tokio::spawn(async move {
        loop {
            let mut deleted: usize = 0;
            for (session, expiration) in sesh_tree_cleaner.iter().filter_map(Result::ok) {
                let mut exp = [0; 8];
                exp.clone_from_slice(&expiration);
                if SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs()
                    > u64::from_be_bytes(exp)
                {
                    if let Err(e) = sesh_tree_cleaner.remove(session) {
                        slog::error!(
                            sesh_cleaner_logger,
                            "ERROR";
                            "context" => "session cleaner",
                            "reason" => %e,
                        )
                    };
                    deleted += 1;
                }
            }
            slog::info!(sesh_cleaner_logger, "session cleaner complete"; "deleted" => deleted);
            tokio::time::sleep(HOUR).await;
        }
    });
    let data_tree = db.open_tree("data")?;
    let new_data_tree = data_tree.clone();
    let new_data_small_tree = data_tree.clone();
    let data_tree_cleaner = data_tree.clone();
    let content_type_tree = db.open_tree("content-type")?;
    let new_content_type_tree = content_type_tree.clone();
    let new_content_type_small_tree = content_type_tree.clone();
    let content_type_tree_cleaner = content_type_tree.clone();
    let expiration_tree = db.open_tree("expiration")?;
    let new_expiration_tree = expiration_tree.clone();
    let new_expiration_small_tree = expiration_tree.clone();
    let expiration_tree_cleaner = expiration_tree.clone();
    tokio::spawn(async move {
        loop {
            let mut deleted: usize = 0;
            for (key, expiration) in expiration_tree_cleaner.iter().filter_map(Result::ok) {
                let mut exp = [0; 8];
                exp.clone_from_slice(&expiration);
                if SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs()
                    > u64::from_be_bytes(exp)
                {
                    if let Err(e) = data(
                        expiration_cleaner_logger.clone(),
                        data_tree_cleaner.clone(),
                        content_type_tree_cleaner.clone(),
                        expiration_tree_cleaner.clone(),
                        String::from_utf8(key.to_vec()).unwrap(),
                        Method::DELETE,
                    )
                    .await
                    {
                        slog::error!(
                            expiration_cleaner_logger,
                            "ERROR";
                            "context" => "expiration cleaner",
                            "reason" => %e,
                        )
                    }
                    deleted += 1;
                }
            }
            slog::info!(expiration_cleaner_logger, "expiration cleaner complete"; "deleted" => deleted);
            tokio::time::sleep(HOUR).await;
        }
    });
    let filter = warp::filters::any::any()
        .and_then(|| async { Err::<Response<Body>, _>(warp::reject::reject()) })
        .or(warp::path!("api" / "data" / String)
            .and(warp::method())
            .and_then(move |key, method| {
                let data_tree = data_tree.clone();
                let content_type_tree = content_type_tree.clone();
                let expiration_tree = expiration_tree.clone();
                let data_logger_clone = data_logger.clone();
                failable(data_logger.clone(), "data", move || {
                    data(
                        data_logger_clone.clone(),
                        data_tree,
                        content_type_tree,
                        expiration_tree,
                        key,
                        method,
                    )
                })
            }))
        .or(warp::path!("api" / "data")
            .and(warp::path::end())
            .and(warp::post())
            .and(warp::cookie("session"))
            .and(warp::header("content-type"))
            .and(warp::header::optional("x-paste-expiration"))
            .and(warp::body::content_length_limit(1_u64 << 20_u64))
            .and(warp::body::bytes())
            .and_then(
                move |session, content_type, expiration: Option<u64>, body| {
                    let sesh_tree_data_small = sesh_tree_data_small.clone();
                    let new_data_small_tree = new_data_small_tree.clone();
                    let new_content_type_small_tree = new_content_type_small_tree.clone();
                    let new_expiration_small_tree = new_expiration_small_tree.clone();
                    let new_data_small_logger_clone = new_data_small_logger.clone();
                    failable(new_data_small_logger.clone(), "new data small", move || {
                        authenticate(sesh_tree_data_small, session, move |_| {
                            new_data_small(
                                new_data_small_logger_clone.clone(),
                                new_data_small_tree,
                                new_content_type_small_tree,
                                new_expiration_small_tree,
                                content_type,
                                expiration.unwrap_or_else(|| {
                                    (SystemTime::now()
                                        .duration_since(UNIX_EPOCH)
                                        .unwrap_or(Duration::from_secs(0))
                                        + DAY)
                                        .as_secs()
                                }),
                                body,
                            )
                        })
                        .map_ok(|hash| ok_json(&NewDataRes { hash }))
                    })
                },
            ));
    #[cfg(not(feature = "demo"))]
    let filter = filter.or(warp::path!("api" / "data")
        .and(warp::path::end())
        .and(warp::post())
        .and(warp::cookie("session"))
        .and(warp::header("content-type"))
        .and(warp::header::optional("x-paste-expiration"))
        .and(warp::body::stream())
        .and_then(
            move |session, content_type, expiration: Option<u64>, body| {
                let sesh_tree_data = sesh_tree_data.clone();
                let new_data_tree = new_data_tree.clone();
                let new_content_type_tree = new_content_type_tree.clone();
                let new_expiration_tree = new_expiration_tree.clone();
                let new_data_logger_clone = new_data_logger.clone();
                failable(new_data_logger.clone(), "new data", move || {
                    authenticate(sesh_tree_data, session, move |_| {
                        new_data(
                            new_data_logger_clone.clone(),
                            new_data_tree,
                            new_content_type_tree,
                            new_expiration_tree,
                            content_type,
                            expiration.unwrap_or_else(|| {
                                (SystemTime::now()
                                    .duration_since(UNIX_EPOCH)
                                    .unwrap_or(Duration::from_secs(0))
                                    + DAY)
                                    .as_secs()
                            }),
                            body,
                        )
                    })
                    .map_ok(|hash| ok_json(&NewDataRes { hash }))
                })
            },
        ));
    let filter = filter
        .or(warp::path!("api" / "data")
            .and(warp::path::end())
            .and(warp::post())
            .and(warp::cookie::<String>("session"))
            .map(|_| bad_request("Missing Content-Type")))
        .or(warp::path!("api" / "data")
            .and(warp::path::end())
            .and(warp::post())
            .map(unauthorized))
        .or(warp::path!("api" / "data")
            .and(warp::path::end())
            .map(method_not_allowed))
        .or(warp::path!("api" / "login")
            .and(warp::path::end())
            .and(warp::post())
            .and(warp::body::json())
            .and_then(move |login_info| {
                let pwd_hash = pwd_hash.clone();
                let sesh_tree = sesh_tree.clone();
                failable(login_logger.clone(), "login", move || {
                    login(pwd_hash, sesh_tree, login_info)
                })
            }))
        .or(warp::path!("api" / "login")
            .and(warp::path::end())
            .and(warp::post())
            .and(warp::header::exact("content-type", "application/json"))
            .and(warp::body::bytes())
            .map(|body: Bytes| {
                if let Err(e) = serde_json::from_slice::<Login>(&*body) {
                    bad_request(e)
                } else {
                    internal_server_error("Unknown Error")
                }
            }))
        .or(warp::path!("api" / "login")
            .and(warp::path::end())
            .and(warp::post())
            .map(|| bad_request("Content-Type must be application/json")))
        .or(warp::path!("api" / "login")
            .and(warp::path::end())
            .map(method_not_allowed))
        .or(warp::path!("api" / "logout")
            .and(warp::path::end())
            .and(warp::post())
            .and(warp::cookie("session"))
            .and_then(move |session| {
                let sesh_tree_login = sesh_tree_login.clone();
                failable(logout_logger.clone(), "logout", move || {
                    logout(sesh_tree_login, session)
                })
            }))
        .or(warp::path!("api" / "logout")
            .and(warp::path::end())
            .and(warp::post())
            .map(no_content))
        .or(warp::path!("api" / "logout")
            .and(warp::path::end())
            .map(method_not_allowed))
        .or(warp::path("api").map(not_found))
        .or(warp::method()
            .and(warp::path::full())
            .and(warp::header::headers_cloned())
            .map(|method, path: warp::path::FullPath, headers| {
                match RESPONDER.parts_respond_or_error(
                    &method,
                    &path.as_str().parse().unwrap(),
                    &headers,
                ) {
                    Ok(mut res) => {
                        res.headers_mut()
                            .insert("X-Consulate-App-ID", APP_ID.clone());
                        res.headers_mut()
                            .insert("X-Consulate-App-Version", APP_VERSION.clone());
                        res
                    }
                    Err(ResponderError::LoaderPathNotFound) => {
                        let mut res = RESPONDER.parts_respond(&method, &*ERROR_PAGE_404, &headers);
                        res.headers_mut()
                            .insert("X-Consulate-App-ID", APP_ID.clone());
                        res.headers_mut()
                            .insert("X-Consulate-App-Version", APP_VERSION.clone());
                        res
                    }
                    Err(e) => e.as_default_response(),
                }
            }));
    warp::serve(filter)
        .bind((
            [0, 0, 0, 0],
            std::env::var("PORT")
                .map_err(Error::from)
                .and_then(|p| p.parse().map_err(Error::from))
                .unwrap_or(80_u16),
        ))
        .await;
    Ok(())
}
