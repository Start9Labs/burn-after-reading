# Burn After Reading

Burn After Reading is a simple, fast, standalone pastebin service for the [StartOS](https://github.com/start9Labs/start-os) that uses Tor (.onion) ephemeral links to share encrypted messages and files that are destroyed (burned) after they are viewed.

Using a Tor-enabled browser, you can try the hosted demo here: http://burrrrn6i4g4feosxlliwgfn5ocdznkxxkcfu5ftnwyzxk7fdbwfibyd.onion/.

There is also a clearnet version here: https://burnafterreading.net.

This repository also creates the `s9pk` package that is installed to run `burn-after-reading` on [StartOS](https://github.com/Start9Labs/start-os/).

## Dependencies

Install the system dependencies below to build this project by following the instructions in the provided links. You can also find detailed steps to setup your environment in the service packaging [documentation](https://github.com/Start9Labs/service-pipeline#development-environment).

- [docker](https://docs.docker.com/get-docker)
- [docker-buildx](https://docs.docker.com/buildx/working-with-buildx/)
- [rust](https://rustup.rs)
- [yq](https://mikefarah.gitbook.io/yq)
- [jq](https://stedolan.github.io/jq/)
- [toml-cli](https://crates.io/crates/toml-cli)
- [web-static-pack-packer](https://crates.io/crates/web-static-pack-packer)
- [start-sdk](https://github.com/Start9Labs/start-os/blob/sdk/backend/install-sdk.sh)
- [make](https://www.gnu.org/software/make/)

## Cloning

Clone the project locally:

```
git clone git@github.com:Start9Labs/burn-after-reading.git
cd burn-after-reading
```

## Building

After setting up your environment, build the `burn-after-reading` package by running:

```
make
```

To build the `burn-after-reading` package for a single platform, run:

```
# for amd64
make x86
```

or

```
# for arm64
make arm
```

## Installing (on StartOS)

Via the StartOS web-UI:

Go to System > Sideload Service and select the burn-after-reading.s9pk file you built.

Via CLI (SSH'd into your server):

> :information_source: Change adjective-noun.local to your StartOS hostname

Run the following commands to install:

```
start-cli auth login
# Enter your StartOS password
start-cli --host https://adjective-noun.local package install burn-after-reading.s9pk
```

If you already have your `start-cli` config file setup with a default `host`,
you can install simply by running:

```
make install
```

### Verify Install

Via the StartOS web-UI, select Services > **burn-after-reading**, configure and start the service. Then, verify its interfaces are accessible.

**Done!**