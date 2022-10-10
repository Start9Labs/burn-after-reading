EMVER := $(shell yq e ".version" manifest.yaml)
ASSET_PATHS := $(shell find ./assets/*)
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

clean:
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf backend/target
	rm image.tar
	rm burn-after-reading.s9pk

verify: burn-after-reading.s9pk $(S9PK_PATH)
	embassy-sdk verify s9pk $(S9PK_PATH)

burn-after-reading.s9pk: manifest.yaml image.tar LICENSE instructions.md icon.png $(ASSET_PATHS)
	embassy-sdk pack

image.tar: Dockerfile check-web.sh backend/target/x86_64-unknown-linux-musl/release/burn-after-reading check-web.sh
	DOCKER_CLI_EXPERIMENTAL=enabled docker buildx build --tag start9/burn-after-reading/main:${EMVER} --platform=linux/amd64 -o type=docker,dest=image.tar .

backend/target/x86_64-unknown-linux-musl/release/burn-after-reading: $(BACKEND_SRC) backend/src/ui.pack
	docker run --rm -it -v ~/.cargo/registry:/root/.cargo/registry -v "$(shell pwd)"/backend:/home/rust/src start9/rust-musl-cross:x86_64-musl cargo build --release

backend/Cargo.toml: manifest.yaml
	toml set backend/Cargo.toml package.version "$(EMVER)" > backend/Cargo.toml.tmp && mv backend/Cargo.toml.tmp backend/Cargo.toml
	toml set backend/Cargo.toml package.description "$(shell yq e ".description.long" manifest.yaml)" > backend/Cargo.toml.tmp && mv backend/Cargo.toml.tmp backend/Cargo.toml

backend/src/ui.pack: frontend/dist
	web-static-pack-packer frontend/dist backend/src/ui.pack

frontend/dist: $(FRONTEND_SRC) frontend/node_modules
	npm --prefix frontend run build

frontend/node_modules: frontend/package.json
	npm --prefix frontend ci

frontend/package.json: manifest.yaml
	cat frontend/package.json | jq '.version = "$(EMVER)"' > frontend/package.json.tmp && mv frontend/package.json.tmp frontend/package.json
	cat frontend/package.json | jq '.description = "$(shell yq e ".description.long" manifest.yaml)"' > frontend/package.json.tmp && mv frontend/package.json.tmp frontend/package.json
