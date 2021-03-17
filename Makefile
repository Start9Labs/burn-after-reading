VERSION := $(shell yq e ".version" manifest.yaml)
BACKEND_SRC := $(shell find ./backend/src/ -name '*.rs') backend/Cargo.toml backend/Cargo.lock
FRONTEND_SRC := \
	$(shell find ./frontend/src/) \
	frontend/package.json \
	frontend/browserslist \
	frontend/ionic.config.json \
	frontend/tsconfig.json \
	frontend/fe-config.json

.DELETE_ON_ERROR:

all: burn-after-reading.s9pk

burn-after-reading.s9pk: manifest.yaml config_spec.yaml config_rules.yaml image.tar
	appmgr -vv pack $(shell pwd) -o burn-after-reading.s9pk
	appmgr -vv verify burn-after-reading.s9pk

image.tar: Dockerfile backend/target/armv7-unknown-linux-musleabihf/release/burn-after-reading
	DOCKER_CLI_EXPERIMENTAL=enabled docker buildx build --tag start9/burn-after-reading --platform=linux/arm/v7 -o type=docker,dest=image.tar .

backend/target/armv7-unknown-linux-musleabihf/release/burn-after-reading: $(BACKEND_SRC) backend/src/ui.pack
	docker run --rm -it -v ~/.cargo/registry:/root/.cargo/registry -v "$(shell pwd)"/backend:/home/rust/src start9/rust-musl-cross:armv7-musleabihf cargo +beta build --bins --release
	docker run --rm -it -v ~/.cargo/registry:/root/.cargo/registry -v "$(shell pwd)"/backend:/home/rust/src start9/rust-musl-cross:armv7-musleabihf musl-strip target/armv7-unknown-linux-musleabihf/release/burn-after-reading

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
