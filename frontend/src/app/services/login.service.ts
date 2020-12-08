import { Injectable } from '@angular/core'
import { BehaviorSubject, Subscription } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'
import { chill } from '../util/misc.util'
import { ApiService } from './api/api.service'
import { AuthState, AuthStore } from './auth.store'

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  constructor (
    private readonly api: ApiService,
    private readonly authStore: AuthStore,
  ) { }

  async login (password: string): Promise<void> {
    try {
      const isAuthed = await this.api.login(password)
      if (isAuthed) {
        this.authStore.setAuthState(AuthState.VERIFIED)
      } else {
        this.authStore.setAuthState(AuthState.UNVERIFIED)
        throw new Error('Invalid Credentials')
      }
    } catch (e) {
      console.error(`Failed login attempt`, e)
      throw e
    }
  }

  async logout (): Promise<void> {
    try {
      await this.api.logout()
      this.authStore.setAuthState(AuthState.UNVERIFIED)
    } catch (e) {
      console.error(`Failed Logout Attempt`, e)
      throw e
    }
  }
}

