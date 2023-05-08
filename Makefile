PKG_VERSION := 0.1.5.2
PKG_ID := burn-after-reading
BACKEND_SRC := $(shell find ./backend/src/ -name '*.rs') backend/Cargo.toml backend/Cargo.lock
FRONTEND_SRC := \
	$(shell find ./frontend/src/) \
	frontend/package.json \
	frontend/browserslist \
	frontend/ionic.config.json \
	frontend/tsconfig.json \
	frontend/fe-config.json
TS_FILES := $(shell find . -name \*.ts )

.DELETE_ON_ERROR:

all: verify

clean:
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf backend/target
	rm -f image.tar
	rm -f $(PKG_ID).s9pk

verify: $(PKG_ID).s9pk
	embassy-sdk verify s9pk $(PKG_ID).s9pk

# assumes /etc/embassy/config.yaml exists on local system with `host: "http://embassy-server-name.local"` configured
install: $(PKG_ID).s9pk
	embassy-cli package install $(PKG_ID).s9pk

$(PKG_ID).s9pk: LICENSE instructions.md icon.png scripts/embassy.js docker-images/aarch64.tar docker-images/x86_64.tar
	if ! [ -z "$(ARCH)" ]; then cp docker-images/$(ARCH).tar image.tar; fi
	embassy-sdk pack

docker-images/x86_64.tar: Dockerfile backend/target/x86_64-unknown-linux-musl/release/burn-after-reading
	mkdir -p docker-images
	DOCKER_CLI_EXPERIMENTAL=enabled docker buildx build --tag start9/burn-after-reading/main:$(PKG_VERSION) --platform=linux/amd64 --build-arg ARCH=x86_64 -o type=docker,dest=docker-images/x86_64.tar .

docker-images/aarch64.tar: Dockerfile backend/target/aarch64-unknown-linux-musl/release/burn-after-reading
	mkdir -p docker-images
	DOCKER_CLI_EXPERIMENTAL=enabled docker buildx build --tag start9/burn-after-reading/main:$(PKG_VERSION) --platform=linux/arm64 --build-arg ARCH=aarch64 -o type=docker,dest=docker-images/aarch64.tar .

backend/target/x86_64-unknown-linux-musl/release/burn-after-reading: $(BACKEND_SRC) backend/src/ui.pack
	docker run --rm -it -v ~/.cargo/registry:/root/.cargo/registry -v "$(shell pwd)"/backend:/home/rust/src start9/rust-musl-cross:x86_64-musl cargo +nightly build --release

backend/target/aarch64-unknown-linux-musl/release/burn-after-reading: $(BACKEND_SRC) backend/src/ui.pack
	docker run --rm -it -v ~/.cargo/registry:/root/.cargo/registry -v "$(shell pwd)"/backend:/home/rust/src start9/rust-musl-cross:aarch64-musl cargo +nightly build --release

backend/src/ui.pack: frontend/dist
	web-static-pack-packer frontend/dist backend/src/ui.pack

frontend/dist: $(FRONTEND_SRC) frontend/node_modules
	npm --prefix frontend run build

frontend/node_modules: frontend/package.json
	npm --prefix frontend ci

scripts/embassy.js: $(TS_FILES)
	deno bundle scripts/embassy.ts scripts/embassy.js