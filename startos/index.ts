/**
 * Plumbing. DO NOT EDIT.
 */
export { createBackup, restoreBackup } from './backups'
export { main } from './main'
export { packageInit, packageUninit, containerInit } from './init'
export { actions } from './actions'
import { buildManifest } from '@start9labs/start-sdk'
import { manifest as sdkManifest } from './manifest'
import { versions } from './versions'
export const manifest = buildManifest(versions, sdkManifest)
