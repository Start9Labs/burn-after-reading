import { setupManifest } from '@start9labs/start-sdk'

export const manifest = setupManifest({
  id: 'burn-after-reading',
  title: 'Burn After Reading',
  license: 'MIT',
  wrapperRepo: 'https://github.com/Start9Labs/burn-after-reading',
  upstreamRepo: 'https://github.com/Start9Labs/burn-after-reading',
  supportSite: 'https://matrix.to/#/!lMnRwPWnyQvOfAoEnD:matrix.start9labs.com',
  marketingSite: 'https://start9.com',
  donationUrl: null,
  description: {
    short:
      'Sharing private messages and files that are destroyed after they are viewed.',
    long: 'A simple, fast, standalone past bin service that uses ephemeral links to share encrypted messages and files that are destroyed (burned) after they are viewed. Content is stored directly on the Start9 server, and there are no trusted 3rd parties.',
  },
  volumes: ['main'],
  images: {
    bar: {
      source: {
        dockerBuild: {},
      },
    },
  },
  hardwareRequirements: {},
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
