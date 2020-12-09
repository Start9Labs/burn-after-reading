# Burn After Reading

An encrypted file and message sharing tool built for the [Start9 Embassy](https://start9labs.com/). BAR destroys content after viewing via a one-time Tor link. All data is stored on your Embassy, arguably making it the easiest, most private, and most secure method of conveying sensitive information online without trusting a third party. 

## Dependencies

- [docker](https://docs.docker.com/get-docker)
- [docker-buildx](https://docs.docker.com/buildx/working-with-buildx/)
- [rust](https://rustup.rs)
- [yq](https://mikefarah.gitbook.io/yq)
- [jq](https://stedolan.github.io/jq/)
- [toml-cli](https://crates.io/crates/toml-cli)
- [web-static-pack-packer](https://crates.io/crates/web-static-pack-packer)
- [appmgr](https://github.com/Start9Labs/appmgr)
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
appmgr install burn-after-reading.s9pk
```
