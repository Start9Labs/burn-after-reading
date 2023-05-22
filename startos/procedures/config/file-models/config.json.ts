import FileHelper from '@start9labs/start-sdk/lib/util/fileHelper'
import { matches } from '@start9labs/start-sdk/lib'

const { object, array, string } = matches

const shape = object({
  hosts: array(string),
})

export const configFile = FileHelper.json('config.json', shape)
