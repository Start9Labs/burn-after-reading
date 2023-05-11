import { sdk } from '../sdk'
import { checkPortListening } from '@start9labs/start-sdk/lib/health/checkFns'
import exportInterfaces from '@start9labs/start-sdk/lib/mainFn/exportInterfaces'
import { ExpectedExports } from '@start9labs/start-sdk/lib/types'
import { NetworkInterfaceBuilder } from '@start9labs/start-sdk/lib/mainFn/NetworkInterfaceBuilder'
import { HealthReceipt } from '@start9labs/start-sdk/lib/health/HealthReceipt'
import { Daemons } from '@start9labs/start-sdk/lib/mainFn/Daemons'

export const main: ExpectedExports.main = sdk.setupMain(
  async ({ effects, utils, started }) => {
    /**
     * ======================== Setup ========================
     *
     * In this section, you will fetch any resources or run any commands necessary to run the service
     */
    console.info('Starting Burn After Reading!')

    /**
     * ======================== Interfaces ========================
     *
     * In this section, you will decide how the service will be exposed to the outside world
     *
     * Naming convention reference: https://developer.mozilla.org/en-US/docs/Web/API/Location
     */

    // ------------ Reverse Proxy ----------------

    // set up a reverse proxy to enable https for LAN
    await effects.reverseProxy({
      bind: {
        port: 443,
        ssl: true,
      },
      dst: {
        port: 80,
        ssl: false,
      },
    })

    // ------------ Tor ------------

    // Find or generate a random Tor hostname by ID
    const torHostname = utils.torHostName('torHostname')

    // Create a Tor host with the assigned port mapping
    const torHostTcp = await torHostname.bindTor(80, 80)
    // Assign the Tor host a web protocol (e.g. "http", "ws")
    const torOriginHttp = torHostTcp.createOrigin('http')

    // ------------ LAN ------------

    // Create a LAN host with the assigned internal port
    const lanHostSsl = await utils.bindLan(443)
    // Assign the LAN host a web protocol (e.g. "https", "wss")
    const lanOriginsHttps = lanHostSsl.createOrigins('https')

    // ------------ Interface ----------------

    // An interface is a grouping of addresses that expose the same resource (e.g. a UI or RPC API).
    // Addresses are different "routes" to the same destination

    // Define the Interface for user display and consumption
    const webInterface = new NetworkInterfaceBuilder({
      effects,
      name: 'Web UI',
      id: 'webui',
      description: 'The web interface of Burn After Reading',
      ui: true,
      username: null,
      path: '',
      search: {},
    })

    // Choose which origins to attach to this interface. The resulting addresses will share the attributes of the interface (name, path, search, etc)
    const webReceipt = await webInterface.export([
      torOriginHttp,
      ...lanOriginsHttps.ip,
      lanOriginsHttps.local,
    ])

    // Export all address receipts for all interfaces to obtain interface receipt
    const interfaceReceipt = exportInterfaces(webReceipt)

    /**
     * ======================== Additional Health Checks (optional) ========================
     *
     * In this section, you will define additional health checks beyond those associated with daemons
     */
    const healthReceipts: HealthReceipt[] = []

    /**
     * ======================== Daemons ========================
     *
     * In this section, you will create one or more daemons that define the service runtime
     *
     * Each daemon defines its own health check, which can optionally be exposed to the user
     */
    return Daemons.of({
      effects,
      started,
      interfaceReceipt, // Provide the interfaceReceipt to prove it was completed
      healthReceipts, // Provide the healthReceipts or [] to prove they were at least considered
    }).addDaemon('webui', {
      command: '/usr/local/bin/burn-after-reading', // The command to start the daemon
      ready: {
        display: 'Web Interface',
        // The function to run to determine the health status of the daemon
        fn: () =>
          checkPortListening(effects, 80, {
            successMessage: 'The web interface is ready',
            errorMessage: 'The web interface is not ready',
          }),
      },
      requires: [],
    })
  },
)
