FROM alpine:latest

RUN apk update
RUN apk add bash curl tini

WORKDIR /root

ADD ./backend/target/aarch64-unknown-linux-musl/release/burn-after-reading /usr/local/bin/burn-after-reading
ADD ./check-web.sh /usr/local/bin/check-web.sh
RUN chmod +x /usr/local/bin/check-web.sh

ENTRYPOINT [ "tini", "/usr/local/bin/burn-after-reading" ]
