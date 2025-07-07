import { resetPassword } from '../actions/resetPassword'
import { pwdTxt } from '../fileModels/pwd.txt'
import { sdk } from '../sdk'

export const taskResetPassword = sdk.setupOnInit(async (effects, _kind) => {
  try {
    const hasPass = await pwdTxt.read().const(effects)
    if (!hasPass) {
      await sdk.action.createOwnTask(effects, resetPassword, 'critical', {
        reason:
          'Create a password for accessing your private Burn After Reading UI',
      })
    }
  } catch (error) {
    // If file does not exist, create the task
    await sdk.action.createOwnTask(effects, resetPassword, 'critical', {
      reason:
        'Create a password for accessing your private Burn After Reading UI',
    })
  }
})
