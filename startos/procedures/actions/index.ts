import { sdk } from '../../sdk'
import { resetPassword } from './resetPassword'

export const { actions, actionsMetadata } = sdk.setupActions(resetPassword)
