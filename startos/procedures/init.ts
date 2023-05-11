import { sdk } from '../sdk'
import { migrations } from './migrations'
import { getDefaultString } from '@start9labs/start-sdk/lib/util/getDefaultString'
import { randomPassword } from '../util'
import { writeFile } from 'fs/promises'

const install = sdk.setupInstall(async ({ effects, utils }) => {
  // generate random password
  const password = getDefaultString(randomPassword)
  // Save password to vault
  await effects.vault.set({ key: 'password', value: password })
  // Save password to dir
  await writeFile('pwd.txt', password)
})

const uninstall = sdk.setupUninstall(async ({ effects, utils }) => {})

export const { init, uninit } = sdk.setupInit(migrations, install, uninstall)
