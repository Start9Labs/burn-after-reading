# Burn After Reading

Burn After Reading is a simple, fast, standalone pastebin service for the [Start9 Embassy](https://start9labs.com) that uses Tor (.onion) ephemeral links to share encrypted messages and files that are destroyed (burned) after they are viewed. Using a Tor-enabled browser, you can try the hosted demo version here: http://burrrrn6i4g4feosxlliwgfn5ocdznkxxkcfu5ftnwyzxk7fdbwfibyd.onion/.

## Dependencies

- [docker](https://docs.docker.com/get-docker)
- [docker-buildx](https://docs.docker.com/buildx/working-with-buildx/)
- [rust](https://rustup.rs)
- [yq](https://mikefarah.gitbook.io/yq)
- [jq](https://stedolan.github.io/jq/)
- [toml-cli](https://crates.io/crates/toml-cli)
- [web-static-pack-packer](https://crates.io/crates/web-static-pack-packer)
- [embassy-sdk](https://github.com/Start9Labs/embassy-os/blob/master/backend/install-sdk.sh)
- [make](https://www.gnu.org/software/make/)

## Cloning

Clone the project locally. Note the submodule link to the original project(s). 

```
git clone git@github.com:Start9Labs/burn-after-reading.git
cd burn-after-reading
```

## Building

To build the project, run the following commands:

```
make
```

## Installing (on Embassy)

SSH into an Embassy device.
`scp` the `.s9pk` to any directory from your local machine.
Run the following command to determine successful install:

```
embassy-cli auth login
embassy-cli package install burn-after-reading.s9pk
```
