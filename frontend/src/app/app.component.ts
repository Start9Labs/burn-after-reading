import { Component } from '@angular/core'
import { ApiService } from './services/api/api.service'
import { AuthStore } from './services/auth.store'
import { ConfigService } from './services/config.service'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor (
    private readonly authStore: AuthStore,
    private readonly apiService: ApiService,
    public readonly config: ConfigService,
  ) {
    this.initializeApp()
    this.redirectHttpTraffic()
  }

  async initializeApp () {
    this.authStore.restoreCache()
    await this.apiService.initialize()
  }

  redirectHttpTraffic () {
    if (this.config.isDemo && window.location.protocol === 'http:' && !window.location.hostname.endsWith('.onion')) {
      window.location.protocol = 'https:'
    }
  }
}
