import { Migration } from '@start9labs/start-sdk/lib/inits/migrations/Migration'
import { readFile } from 'fs/promises'
import { load } from 'js-yaml'

export const v0_1_5_2 = new Migration({
  version: '0.1.5.2',
  up: async ({ effects }) => {
    // get password from config.yaml
    const configYaml = load(
      await readFile('/root/start9/config.yaml', 'base64'),
    ) as { password: string }

    // Save password to vault
    await effects.vault.set({ key: 'password', value: configYaml.password })

    // remove old start9 dir
    await effects.runCommand(['rm', '-rf', '/root/start9'])
  },
  down: async ({ effects }) => {
    throw new Error('Downgrade not permitted')
  },
})
