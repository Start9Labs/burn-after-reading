import { setupManifest } from '@start9labs/start-sdk'
import { SDKImageInputSpec } from '@start9labs/start-sdk/base/lib/types/ManifestTypes'

const BUILD = process.env.BUILD || ''

const architectures =
  BUILD === 'x86_64' || BUILD === 'aarch64' ? [BUILD] : ['x86_64', 'aarch64']

export const manifest = setupManifest({
  id: 'burn-after-reading',
  title: 'Burn After Reading',
  license: 'MIT',
  wrapperRepo: 'https://github.com/Start9Labs/burn-after-reading',
  upstreamRepo: 'https://github.com/Start9Labs/burn-after-reading',
  supportSite: 'https://matrix.to/#/!lMnRwPWnyQvOfAoEnD:matrix.start9labs.com',
  marketingSite: 'https://start9.com',
  donationUrl: null,
  docsUrl: 'https://github.com/Start9Labs/burn-after-reading/blob/update/040/docs/README.md',
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
      arch: architectures,
    } as SDKImageInputSpec,
  },
  hardwareRequirements: { arch: architectures },
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
