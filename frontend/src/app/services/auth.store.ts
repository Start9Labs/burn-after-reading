import { Injectable } from '@angular/core'
import { BehaviorSubject, Subscription } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'
import { chill } from '../util/misc.util'

export enum AuthState {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED = 'VERIFIED',
}
const LOGGED_IN_KEY = 'logged-in'

@Injectable({
  providedIn: 'root',
})
export class AuthStore {
  private readonly $authState$ = new BehaviorSubject(AuthState.UNVERIFIED) as BehaviorSubject<AuthState>

  constructor () { }

  peek (): AuthState { return this.$authState$.getValue() }
  isLoggedIn () : boolean { return this.peek() === AuthState.VERIFIED }
  listen (callback: Partial<{ [k in AuthState]: () => any }>): Subscription {
    return this.$authState$.pipe(distinctUntilChanged()).subscribe(s => {
      return (callback[s] || chill)()
    })
  }

  restoreCache (): void {
    const authState = localStorage.getItem(LOGGED_IN_KEY) as AuthState
    this.$authState$.next(authState || AuthState.UNVERIFIED)
  }

  setAuthState (a: AuthState) {
    this.$authState$.next(a)
    if (a === AuthState.VERIFIED) {
      localStorage.setItem(LOGGED_IN_KEY, a)
    } else {
      localStorage.removeItem(LOGGED_IN_KEY)
    }
  }
}

