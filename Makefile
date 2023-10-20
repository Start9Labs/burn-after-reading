PKG_VERSION := $(shell yq e ".version" manifest.yaml)
PKG_ID := $(shell yq e ".id" manifest.yaml)
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

arm:
	@rm -f docker-images/x86_64.tar
	@ARCH=aarch64 $(MAKE)

x86:
	@rm -f docker-images/aarch64.tar
	@ARCH=x86_64 $(MAKE)

clean:
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf backend/target
	rm -rf docker-images
	rm -f $(PKG_ID).s9pk 

frontend/package.json: manifest.yaml
	cat frontend/package.json | jq '.version = "$(PKG_VERSION)"' > frontend/package.json.tmp && mv frontend/package.json.tmp frontend/package.json
	cat frontend/package.json | jq '.description = "$(shell yq e ".description.long" manifest.yaml)"' > frontend/package.json.tmp && mv frontend/package.json.tmp frontend/package.json

frontend/node_modules: frontend/package.json
	npm --prefix frontend ci

frontend/dist: $(FRONTEND_SRC) frontend/node_modules
	npm --prefix frontend run build

verify: $(PKG_ID).s9pk
	@start-sdk verify s9pk $(PKG_ID).s9pk
	@echo " Done!"
	@echo "   Filesize: $(shell du -h $(PKG_ID).s9pk) is ready"

install:
ifeq (,$(wildcard ~/.embassy/config.yaml))
	@echo; echo "You must define \"host: https://server-name.local\" in ~/.embassy/config.yaml config file first"; echo
else
	start-cli package install $(PKG_ID).s9pk
endif

$(PKG_ID).s9pk: manifest.yaml LICENSE instructions.md icon.png scripts/embassy.js docker-images/aarch64.tar docker-images/x86_64.tar
ifeq ($(ARCH),aarch64)
	@echo "start-sdk: Preparing aarch64 package ..."
else ifeq ($(ARCH),x86_64)
	@echo "start-sdk: Preparing x86_64 package ..."
else
	@echo "start-sdk: Preparing Universal Package ..."
endif
	@start-sdk pack

docker-images/x86_64.tar: Dockerfile backend/target/x86_64-unknown-linux-musl/release/burn-after-reading
ifeq ($(ARCH),aarch64)
else
	mkdir -p docker-images
	DOCKER_CLI_EXPERIMENTAL=enabled docker buildx build --tag start9/burn-after-reading/main:$(PKG_VERSION) --platform=linux/amd64 --build-arg ARCH=x86_64 -o type=docker,dest=docker-images/x86_64.tar .
endif

docker-images/aarch64.tar: Dockerfile backend/target/aarch64-unknown-linux-musl/release/burn-after-reading
ifeq ($(ARCH),x86_64)
else
	mkdir -p docker-images
	DOCKER_CLI_EXPERIMENTAL=enabled docker buildx build --tag start9/burn-after-reading/main:$(PKG_VERSION) --platform=linux/arm64 --build-arg ARCH=aarch64 -o type=docker,dest=docker-images/aarch64.tar .
endif

backend/target/x86_64-unknown-linux-musl/release/burn-after-reading: $(BACKEND_SRC) backend/src/ui.pack
ifeq ($(ARCH),aarch64)
else
	docker run --rm -t -v ~/.cargo/registry:/root/.cargo/registry -v "$(shell pwd)"/backend:/home/rust/src messense/rust-musl-cross:x86_64-musl cargo build --release
endif

backend/target/aarch64-unknown-linux-musl/release/burn-after-reading: $(BACKEND_SRC) backend/src/ui.pack
ifeq ($(ARCH),x86_64)
else
	docker run --rm -t -v ~/.cargo/registry:/root/.cargo/registry -v "$(shell pwd)"/backend:/home/rust/src messense/rust-musl-cross:aarch64-musl cargo build --release
endif

backend/Cargo.toml: manifest.yaml
	toml set backend/Cargo.toml package.version "$(PKG_VERSION)" > backend/Cargo.toml.tmp && mv backend/Cargo.toml.tmp backend/Cargo.toml
	toml set backend/Cargo.toml package.description "$(shell yq e ".description.long" manifest.yaml)" > backend/Cargo.toml.tmp && mv backend/Cargo.toml.tmp backend/Cargo.toml

backend/src/ui.pack: frontend/dist
	web-static-pack-packer frontend/dist backend/src/ui.pack

scripts/embassy.js: $(TS_FILES)
	deno bundle scripts/embassy.ts scripts/embassy.js
