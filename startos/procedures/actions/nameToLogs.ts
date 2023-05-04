import { Config } from '@start9labs/start-sdk/lib/config/builder/config'
import { WrapperData } from '../../wrapperData'
import { createAction } from '@start9labs/start-sdk/lib/actions/createAction'
import { Value } from '@start9labs/start-sdk/lib/config/builder/value'

/**
 * This is an example Action
 *
 * By convention, each action receives its own file
 *
 * Actions optionally take an arbitrary config form as input
 */
const input = Config.of({
  nameToPrint: Value.text({
    name: 'Temp Name',
    description: 'If no name is provided, the name from config will be used',
    required: false,
  }),
})

/**
 * This function defines the Action, including the FormSpec (if any)
 *
 * The first argument is the Action metadata. The second argument is the Action function
 *
 * If no input is required, FormSpec would be null
 */
export const nameToLogs = createAction<WrapperData, typeof input>(
  {
    name: 'Name to Logs',
    description: 'Prints "Hello [Name]" to the service logs.',
    id: 'nameToLogs',
    input,
    runningOnly: false,
  },
  async ({ effects, utils, input }) => {
    const name =
      input.nameToPrint ||
      (await utils.getOwnWrapperData('/config/name').once())

    await effects.console.log(`Hello ${name}`)

    return {
      message: `"Hello ${name}" has been written to the service logs. Open your logs to view it.`,
      value: {
        value: name,
        copyable: true,
        qr: false,
      },
    }
  },
)
