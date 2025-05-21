import { resetPassword } from '../actions/resetPassword'
import { pwdTxt } from '../fileModels/pwd.txt'
import { sdk } from '../sdk'

export const taskShowSecretPhrase = sdk.setupOnInstall(async (effects) => {
  if (!(await pwdTxt.read().const(effects))) {
    await sdk.action.requestOwn(effects, resetPassword, 'critical', {
      reason:
        'Create a password for accessing your private Burn After Reading UI',
    })
  }
})
