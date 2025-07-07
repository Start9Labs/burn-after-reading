import { sdk } from '../sdk'
import { utils } from '@start9labs/start-sdk'
import { pwdTxt } from '../fileModels/pwd.txt'

export const resetPassword = sdk.Action.withoutInput(
  // id
  'reset-admin',

  // metadata
  async ({ effects }) => {
    let hasPass = false
    try {
      const password = await pwdTxt.read().const(effects)
      hasPass = !!password
    } catch (error) {
      hasPass = false
    }

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

    // Save password to file
    await pwdTxt.write(effects, password)

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
