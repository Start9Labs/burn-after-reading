import { FileHelper } from '@start9labs/start-sdk'

export const pwdTxt = FileHelper.string({
  volumeId: 'main',
  subpath: '/pwd.txt',
})
