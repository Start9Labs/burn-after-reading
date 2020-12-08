import { Component } from '@angular/core'
import { ApiService } from './services/api/api.service'
import { AuthStore } from './services/auth.store'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor (
    private readonly authStore: AuthStore,
    private readonly apiService: ApiService,
  ) {
    this.initializeApp()
  }

  async initializeApp () {
    this.authStore.restoreCache()
    await this.apiService.initialize()
  }
}
