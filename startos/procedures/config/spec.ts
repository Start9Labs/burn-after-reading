import { sdk } from '../../sdk'
const { Config } = sdk

export const configSpec = Config.of({})

// This line is necessary to satisfy Typescript typings. Do not touch it
export type ConfigSpec = typeof configSpec.validator._TYPE
