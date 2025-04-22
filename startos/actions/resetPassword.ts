import { readFile, writeFile } from 'fs/promises'
import { sdk } from '../sdk'
import { utils } from '@start9labs/start-sdk'

export const resetPassword = sdk.Action.withoutInput(
  // id
  'reset-admin',

  // metadata
  async ({ effects }) => {
    const hasPass = await readFile('pwd.txt')

    return {
      name: hasPass ? 'Reset Password' : 'Create Password',
      description: hasPass ? 'Reset your password' : 'Create your password',
      warning: null,
      allowedStatuses: 'any',
      group: null,
      visibility: 'enabled',
    }
  },

  // the execution function
  async ({ effects }) => {
    const password = utils.getDefaultString({
      charset: 'a-z,A-Z,1-9,!,@,$,%,&,*',
      len: 22,
    })

    // Save password to dir
    await writeFile('pwd.txt', password)

    return {
      version: '1',
      title: 'Success',
      message: 'Your password is below',
      result: {
        type: 'single',
        name: 'Password',
        description: null,
        value: password,
        masked: true,
        copyable: true,
        qr: false,
      },
    }
  },
)
