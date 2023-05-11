import { sdk } from '../../sdk'
import { configSpec } from './spec'

export const save = sdk.setupConfigSave(
  configSpec,
  async ({ effects, utils, input, dependencies }) => {
    const dependenciesReceipt = await effects.setDependencies([])

    return {
      dependenciesReceipt,
      restart: false,
    }
  },
)
