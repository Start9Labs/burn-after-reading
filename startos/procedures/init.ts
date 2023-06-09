import { sdk } from '../sdk'
import { migrations } from './migrations'
import { getDefaultString } from '@start9labs/start-sdk/lib/util/getDefaultString'
import { randomPassword } from '../util'
import { writeFile } from 'fs/promises'
import { setInterfaces } from './interfaces'

const install = sdk.setupInstall(async ({ effects, utils }) => {
  // generate random password
  const password = getDefaultString(randomPassword)
  // Save password to vault
  await utils.store.setOwn('/password', password)
  // Save password to dir
  await writeFile('pwd.txt', password)
})

const uninstall = sdk.setupUninstall(async ({ effects, utils }) => {})

const exportedValues = sdk.setupExports(({ effects, utils }) => {
  return {
    ui: [
      {
        title: 'Password',
        path: '/password',
      },
    ],
    services: [],
  }
})

export const { init, uninit } = sdk.setupInit(
  migrations,
  install,
  uninstall,
  setInterfaces,
  exportedValues,
)
