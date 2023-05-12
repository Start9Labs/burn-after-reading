import { sdk } from '../../sdk'
import { setInterfaces } from '../interfaces'
import { configSpec } from './spec'

export const save = sdk.setupConfigSave(
  configSpec,
  async ({ effects, utils, input, dependencies }) => {
    const dependenciesReceipt = await effects.setDependencies([])

    return {
      interfacesReceipt: await setInterfaces({ effects, utils, input }),
      dependenciesReceipt,
      restart: false,
    }
  },
)
