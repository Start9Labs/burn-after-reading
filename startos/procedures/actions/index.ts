import { setupActions } from '@start9labs/start-sdk/lib/actions/setupActions'
import { setPassword } from './resetPassword'

/**
 * Add each new Action as the next argument to this function
 */
export const { actions, actionsMetadata } = setupActions(setPassword)
