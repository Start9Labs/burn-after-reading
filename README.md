# Burn After Reading

Burn After Reading is a simple, fast, standalone pastebin service for the [Start9 Embassy](https://start9.com) that uses Tor (.onion) ephemeral links to share encrypted messages and files that are destroyed (burned) after they are viewed.

Using a Tor-enabled browser, you can try the hosted demo here: http://burrrrn6i4g4feosxlliwgfn5ocdznkxxkcfu5ftnwyzxk7fdbwfibyd.onion/.

There is also a clearnet version here: https://burnafterreading.net.

This repository also creates the `s9pk` package that is installed to run `burn-after-reading` on [embassyOS](https://github.com/Start9Labs/embassy-os/).

## Dependencies

Install the system dependencies below to build this project by following the instructions in the provided links. You can also find detailed steps to setup your environment in the service packaging [documentation](https://github.com/Start9Labs/service-pipeline#development-environment).

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

Clone the project locally:

```
git clone git@github.com:Start9Labs/burn-after-reading.git
cd burn-after-reading
```

## Building

To build the `burn-after-reading` package, run the following command:

```
make
```

## Installing (on embassyOS)

Run the following commands to determine successful install:
> :information_source: Change embassy-server-name.local to your Embassy address

```
embassy-cli auth login
# Enter your embassy password
embassy-cli --host https://embassy-server-name.local package install burn-after-reading.s9pk
```

If you already have your `embassy-cli` config file setup with a default `host`, you can install simply by running:

```
make install
```

> **Tip:** You can also install the burn-after-reading.s9pk using **Sideload Service** under the **Embassy > Settings** section.

### Verify Install

Go to your Embassy Services page, select **Burn After Reading**, configure and start the service. Then, verify its interfaces are accessible.

#Done