import { sdk } from '../sdk'
import { resetPassword } from './resetPassword'

export const actions = sdk.Actions.of().addAction(resetPassword)
