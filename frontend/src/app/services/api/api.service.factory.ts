import { MockApi } from './mock-api.service'
import { LiveApi } from './live-api.service'
import { DemoApi } from './demo-api.service'
import { ConfigService } from '../config.service'
import { ApiService } from './api.service'
import { AuthStore } from '../auth.store'

export function ApiServiceFactory (config: ConfigService, authStore: AuthStore): ApiService {
  switch (config.appType){
    case 'live': return new LiveApi(authStore)
    case 'mock': return new MockApi()
    case 'demo': return new DemoApi(authStore)
  }
}
