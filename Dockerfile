FROM alpine:latest

RUN apk update
RUN apk add bash curl tini

WORKDIR /root

# aarch64 or x86_64
ARG ARCH
ADD ./backend/target/${ARCH}-unknown-linux-musl/release/burn-after-reading /usr/local/bin/burn-after-reading

ENTRYPOINT [ "tini", "/usr/local/bin/burn-after-reading" ]
