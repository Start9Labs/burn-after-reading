import { Config } from '@start9labs/start-sdk/lib/config/builder/config'
import { Value } from '@start9labs/start-sdk/lib/config/builder/value'

/**
 * Here you define the config specification that will ultimately present to the user as validated form inputs
 *
 * Most form controls are available, including text, textarea, number, toggle, select, multiselect, list, color, datetime, object (a subform), and union (a conditional subform)
 */
export const configSpec = Config.of({
  password: Value.text({
    name: 'Password',
    required: {
      default: {
        len: 22,
        charset: 'a-z,A-Z,0-9',
      },
    },
    masked: true,
  }),
})

// This line is necessary to satisfy Typescript typings. Do not touch it
export type ConfigSpec = typeof configSpec.validator._TYPE
