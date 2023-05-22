import { sdk } from '../sdk'
import { checkPortListening } from '@start9labs/start-sdk/lib/health/checkFns'
import { ExpectedExports } from '@start9labs/start-sdk/lib/types'
import { HealthReceipt } from '@start9labs/start-sdk/lib/health/HealthReceipt'
import { Daemons } from '@start9labs/start-sdk/lib/mainFn/Daemons'
import { uiId, uiPort } from './interfaces'
import { configFile } from './config/file-models/config.json'

export const main: ExpectedExports.main = sdk.setupMain(
  async ({ effects, utils, started }) => {
    /**
     * ======================== Setup ========================
     */
    console.info('Starting Burn After Reading!')

    // @TODO use this file on FE/BE. User can choose which hostname to use for paste
    const { primaryHostname, allHostnames } = await utils.networkInterface
      .getOwn(uiId)
      .const()

    const hosts = [primaryHostname].concat(
      allHostnames.filter(
        (h) => !h.includes('.local') && h !== primaryHostname,
      ),
    )

    await configFile.write({ hosts }, effects)

    /**
     * ======================== Additional Health Checks (optional) ========================
     */
    const healthReceipts: HealthReceipt[] = []

    /**
     * ======================== Daemons ========================
     */
    return Daemons.of({
      effects,
      started,
      healthReceipts,
    }).addDaemon('webui', {
      command: '/usr/local/bin/burn-after-reading',
      ready: {
        display: 'Web Interface',
        fn: () =>
          checkPortListening(effects, uiPort, {
            successMessage: 'The web interface is ready',
            errorMessage: 'The web interface is not ready',
          }),
      },
      requires: [],
    })
  },
)
