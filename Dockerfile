FROM alpine:latest

RUN apk update
RUN apk add tini curl

WORKDIR /root

ADD ./backend/target/aarch64-unknown-linux-musl/release/burn-after-reading /usr/local/bin/burn-after-reading

ENTRYPOINT [ "tini", "/usr/local/bin/burn-after-reading" ]