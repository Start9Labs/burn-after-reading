FROM alpine:3.12

RUN apk update
RUN apk add tini

WORKDIR /root

ADD ./backend/target/armv7-unknown-linux-musleabihf/release/burn-after-reading /usr/local/bin/burn-after-reading

ENTRYPOINT [ "tini", "/usr/local/bin/burn-after-reading" ]