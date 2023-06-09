import { sdk } from '../../sdk'
import { readFile, rmdir, writeFile } from 'fs/promises'
import { load } from 'js-yaml'

export const v0_1_5_2 = sdk.Migration.of({
  version: '0.1.5.2',
  up: async ({ effects, utils }) => {
    // get password from config.yaml
    const configYaml = load(
      await readFile('/root/start9/config.yaml', 'utf-8'),
    ) as { password: string }

    // Save password to vault
    await utils.store.setOwn('/password', configYaml.password)
    // Save password to dir
    await writeFile('pwd.txt', configYaml.password)

    // remove old start9 dir
    await rmdir('/root/start9')
  },
  down: async ({ effects }) => {
    throw new Error('Downgrade not permitted')
  },
})
