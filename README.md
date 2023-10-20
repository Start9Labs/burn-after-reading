<p align="center">
  <img src="icon.png" alt="Project Logo" width="21%">
</p>

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

Clone the Burn After Reading Wrapper locally.

```
git clone git@github.com:Start9Labs/burn-after-reading-startos.git
cd burn-after-reading-startos
```

## Building

To build the **Burn After Reading** service as a universal package, run the following command:

```
make
```

Alternatively the package can be built for individual architectures by specifying the architecture as follows:

```
make x86
```

or

```
make arm
```

## Installing (on StartOS)

Before installation, define `host: https://server-name.local` in your `~/.embassy/config.yaml` config file then run the following commands to determine successful install:

> :information_source: Change server-name.local to your Start9 server address

```
start-cli auth login
#Enter your StartOS password
make install
```

**Tip:** You can also install the burn-after-reading.s9pk by sideloading it under the **StartOS > System > Sideload a Service** section.

## Verify Install

Go to your StartOS Services page, select **Burn After Reading**, configure and start the service.

**Done!**
