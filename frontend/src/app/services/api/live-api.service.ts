import { modulateTime } from 'src/app/util/misc.util'
import { Paste } from '../paste/paste'
import { ApiService } from './api.service'
import { AuthState, AuthStore } from '../auth.store'

export class LiveApi extends ApiService {
    constructor (private readonly authStore: AuthStore) { super() }

    async login (password: string): Promise<boolean> {
        const res = await fetch(`/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: 'admin', password }),
        })
        switch (res.status) {
            case 200:
            case 204:
                return true
            case 401:
                return false
            default:
                throw { message: `${res.status} ${res.statusText}`, status: res.status, url: res.url }
        }
    }

    async logout (): Promise<void> {
        const res = await fetch(`/api/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ }),
        })
        switch (res.status) {
            case 200: return
            case 204: return
            default:
                throw { message: `${res.status} ${res.statusText}`, status: res.status, url: res.url }
        }
    }

    async getPaste (hash: string): Promise<Paste | null> {
        const res = await fetch(`/api/data/${hash}`)
        switch (res.status) {
            case 200:
                return new Paste(
                    res.headers.get('Content-Type'),
                    await res.arrayBuffer(),
                )
            case 404:
                return null
            default:
                throw { message: `${res.status} ${res.statusText}`, status: res.status, url: res.url }
        }
    }

    async delPaste (hash: string): Promise<void> {
        const res = await fetch(`/api/data/${hash}`, { method: 'DELETE' })
        switch (res.status) {
            case 200:
            case 204:
                return
            default:
                throw { message: `${res.status} ${res.statusText}`, status: res.status, url: res.url }
        }
    }

    async newPaste (p: Paste): Promise<{ hash: string }> {
        const now = new Date()
        const expireAt = modulateTime(now, 24 * 7, 'hours')
        const epochSec = Math.floor( expireAt.getTime() / 1000 )
        const res = await this.fetchAuth(`/api/data`, {
            method: 'POST',
            headers: { 'Content-Type': p.contentType, 'x-paste-expiration': `${epochSec}`},
            body: await p.content,
        })
        switch (res.status) {
            case 200:
                return res.json()
            default:
                throw { message: `${res.status} ${res.statusText}`, status: res.status, url: res.url }
        }
    }

    async fetchAuth (input: RequestInfo, init?: RequestInit): Promise<Response> {
        if (!this.authStore.isLoggedIn()) {
            throw new Error('Unauthenticated. Do you need to signin?')
        }
        return fetch(input, init).then(res => {
            if (res.status === 401) this.authStore.setAuthState(AuthState.UNVERIFIED)
            return res
        })
    }
}

