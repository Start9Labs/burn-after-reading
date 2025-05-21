import { resetPassword } from '../actions/resetPassword'
import { pwdTxt } from '../fileModels/pwd.txt'
import { sdk } from '../sdk'

export const taskResetPassword = sdk.setupOnInit(async (effects) => {
  if (!(await pwdTxt.read().const(effects))) {
    await sdk.action.createOwnTask(effects, resetPassword, 'critical', {
      reason:
        'Create a password for accessing your private Burn After Reading UI',
    })
  }
})
