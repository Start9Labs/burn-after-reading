import { sdk } from '../../sdk'
import { configSpec } from './spec'

export const read = sdk.setupConfigRead(
  configSpec,
  async ({ effects, utils }) => {},
)
