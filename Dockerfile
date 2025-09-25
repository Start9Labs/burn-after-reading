# Frontend build stage
FROM node:alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Backend build stage
FROM rust:alpine AS builder
RUN apk add --no-cache musl-dev
RUN cargo install web-static-pack-packer
# Docker automatically provides this
ARG TARGETARCH

# Only add the target we need for this specific build
RUN if [ "$TARGETARCH" = "amd64" ]; then \
    rustup target add x86_64-unknown-linux-musl; \
    else \
    rustup target add aarch64-unknown-linux-musl; \
    fi

WORKDIR /app
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist/ ./frontend/dist/

RUN web-static-pack-packer directory-single frontend/dist backend/src/ui.pack

# Build for the current platform and output to consistent location
RUN if [ "$TARGETARCH" = "amd64" ]; then \
    cargo build --release --target x86_64-unknown-linux-musl --manifest-path backend/Cargo.toml && \
    mkdir -p /app/output && \
    cp /app/backend/target/x86_64-unknown-linux-musl/release/burn-after-reading /app/output/burn-after-reading; \
    else \
    cargo build --release --target aarch64-unknown-linux-musl --manifest-path backend/Cargo.toml && \
    mkdir -p /app/output && \
    cp /app/backend/target/aarch64-unknown-linux-musl/release/burn-after-reading /app/output/burn-after-reading; \
    fi

# Final stage
FROM alpine:3.22
COPY --from=builder /app/output/burn-after-reading /usr/local/bin/burn-after-reading
RUN chmod +x /usr/local/bin/burn-after-reading
