VERSION := $(shell yq e ".version" manifest.yaml)
BACKEND_SRC := $(shell find ./backend/src/ -name '*.rs') backend/Cargo.toml backend/Cargo.lock
FRONTEND_SRC := \
	$(shell find ./frontend/src/) \
	frontend/package.json \
	frontend/browserslist \
	frontend/ionic.config.json \
	frontend/tsconfig.json \
	frontend/fe-config.json
S9PK_PATH=$(shell find . -name burn-after-reading.s9pk -print)

.DELETE_ON_ERROR:

all: verify

verify: burn-after-reading.s9pk $(S9PK_PATH)
	embassy-sdk verify $(S9PK_PATH)

burn-after-reading.s9pk: manifest.yaml config_spec.yaml config_rules.yaml image.tar
	embassy-sdk pack

image.tar: Dockerfile backend/target/aarch64-unknown-linux-musl/release/burn-after-reading
	DOCKER_CLI_EXPERIMENTAL=enabled docker buildx build --tag start9/burn-after-reading --platform=linux/arm64 -o type=docker,dest=image.tar .

backend/target/aarch64-unknown-linux-musl/release/burn-after-reading: $(BACKEND_SRC) backend/src/ui.pack
	docker run --rm -it -v ~/.cargo/registry:/root/.cargo/registry -v "$(shell pwd)"/backend:/home/rust/src start9/rust-musl-cross:aarch64-musl cargo +beta build --bins --release
	docker run --rm -it -v ~/.cargo/registry:/root/.cargo/registry -v "$(shell pwd)"/backend:/home/rust/src start9/rust-musl-cross:aarch64-musl musl-strip target/aarch64-unknown-linux-musl/release/burn-after-reading

backend/Cargo.toml: manifest.yaml
	toml set backend/Cargo.toml package.version "$(VERSION)" > backend/Cargo.toml.tmp && mv backend/Cargo.toml.tmp backend/Cargo.toml
	toml set backend/Cargo.toml package.description "$(shell yq e ".description.long" manifest.yaml)" > backend/Cargo.toml.tmp && mv backend/Cargo.toml.tmp backend/Cargo.toml

backend/src/ui.pack: frontend/dist
	web-static-pack-packer frontend/dist backend/src/ui.pack

frontend/dist: $(FRONTEND_SRC) frontend/node_modules
	npm --prefix frontend run build-prod

frontend/node_modules: frontend/package.json
	npm --prefix frontend install

frontend/package.json: manifest.yaml
	cat frontend/package.json | jq '.version = "$(VERSION)"' > frontend/package.json.tmp && mv frontend/package.json.tmp frontend/package.json
	cat frontend/package.json | jq '.description = "$(shell yq e ".description.long" manifest.yaml)"' > frontend/package.json.tmp && mv frontend/package.json.tmp frontend/package.json
