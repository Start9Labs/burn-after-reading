import { sdk } from '../../sdk'
import { randomPassword } from '../../util'
import { writeFile } from 'fs/promises'

const { Config, Value } = sdk

/**
 * This is an example Action
 *
 * By convention, each action receives its own file
 *
 * Actions optionally take an arbitrary config form as input
 */
const input = Config.of({
  password: Value.text({
    name: 'Password',
    required: {
      default: randomPassword,
    },
    generate: randomPassword,
    masked: true,
  }),
})

export const resetPassword = sdk.createAction(
  {
    name: 'Reset Password',
    description: 'Resets your password to the one provided',
    id: 'resetPassword',
    input,
    allowedStatuses: 'any',
  },
  async ({ effects, utils, input }) => {
    // Save password to vault
    await effects.vault.set({ key: 'password', value: input.password })
    // Save password to dir
    await writeFile('pwd.txt', input.password)

    return {
      message: 'Password changed successfully and saved to your Vault.',
      value: {
        value: input.password,
        copyable: true,
        qr: false,
      },
    }
  },
)
