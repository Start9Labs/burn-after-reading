import { setupManifest } from '@start9labs/start-sdk/lib/manifest/setupManifest'
import { actionsMetadata } from './procedures/actions'

/**
 * In this function you define static properties of the service
 */
export const manifest = setupManifest({
  id: 'burn-after-reading',
  title: 'Burn After Reading',
  version: '0.1.5.2',
  releaseNotes: 'Revamped for StartOS 0.4.0',
  license: 'mit',
  replaces: Array<string>('ViaCrypt'),
  wrapperRepo: 'https://github.com/Start9Labs/burn-after-reading',
  upstreamRepo: 'https://github.com/Start9Labs/burn-after-reading',
  supportSite: 'https://github.com/Start9Labs/burn-after-reading/issues',
  marketingSite: 'https://github.com/Start9Labs/burn-after-reading',
  donationUrl: 'https://donate.start9.com/',
  description: {
    short: 'Share messages and files that are destroyed after they are viewed',
    long: 'A simple, fast, standalone service that uses Tor (.onion) ephemeral links to share encrypted messages and files that are destroyed (burned) after they are viewed. Content is stored directly on the Embassy, and there are no trusted 3rd parties.',
  },
  assets: {
    license: 'LICENSE',
    icon: 'assets/icon.png',
    instructions: 'assets/instructions.md',
  },
  volumes: {
    // This is the image where files from the project asset directory will go
    main: 'data',
  },
  containers: {
    main: {
      // Identifier for the main image volume, which will be used when other actions need to mount to this volume.
      image: 'main',
      // Specifies where to mount the data volume(s), if there are any. Mounts for pointer dependency volumes are also denoted here. These are necessary if data needs to be read from / written to these volumes.
      mounts: {
        // Specifies where on the service's file system its persistence directory should be mounted prior to service startup
        main: '/root',
      },
    },
  },
  actions: actionsMetadata,
  alerts: {
    install: null,
    update: null,
    uninstall: null,
    restore: null,
    start: null,
    stop: null,
  },
  /** See Hello Moon for an example with dependencies */
  dependencies: {},
})

export type Manifest = typeof manifest
