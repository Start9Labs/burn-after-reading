import { StartSdk } from '@start9labs/start-sdk/lib/StartSdk'
import { manifest } from './manifest'
import { Store } from './store'

/**
 * This is a static file that provides type safety throughout the codebase
 *
 * the exported sdk const should be used instead of StartSdk directly
 */
export const sdk = StartSdk.of()
  .withManifest(manifest)
  .withStore<Store>()
  .build(true)
