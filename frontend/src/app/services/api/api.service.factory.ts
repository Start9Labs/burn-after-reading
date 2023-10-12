import { MockApi } from './mock-api.service'
import { LiveApi } from './live-api.service'
import { ConfigService } from '../config.service'
import { ApiService } from './api.service'
import { AuthStore } from '../auth.store'

export function ApiServiceFactory (config: ConfigService, authStore: AuthStore): ApiService {
  switch (config.appType){
    case 'demo':
    case 'live': return new LiveApi(authStore)
    case 'mock': return new MockApi()
  }
}
