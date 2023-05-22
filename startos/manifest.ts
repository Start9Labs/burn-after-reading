import { setupManifest } from '@start9labs/start-sdk/lib/manifest/setupManifest'

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
    main: 'data',
  },
  containers: {
    main: {
      image: 'main',
      mounts: {
        main: '/root',
      },
    },
  },
  alerts: {
    install: null,
    update: null,
    uninstall: null,
    restore: null,
    start: null,
    stop: null,
  },
  dependencies: {},
})

export type Manifest = typeof manifest
