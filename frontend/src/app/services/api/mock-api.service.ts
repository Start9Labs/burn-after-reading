import { addPrefix, Paste } from '../paste/paste'
import { pauseFor } from 'src/app/util/misc.util'
import { ApiService } from './api.service'
import { encryptArrayBuffer } from '../paste/crypto'

const crypto = window.crypto

export class MockApi extends ApiService {
    hash = 0
    private pastes: Map<string, Paste>
    private password: string

    constructor (m: Map<string, Paste> = new Map()) {
        super()
        this.pastes = m
        this.password = 'password'
    }

    async initialize () {
        const t = new TextEncoder()
        const content = t.encode('Mock paste bb, you cute.')
        return this.newPaste(
            new Paste(
                'text/plain',
                await encryptArrayBuffer(addPrefix(content, 'MyPasteBB'), 'abc'),
            ),
            new Date()
        )
    }

    async login (password: string): Promise<boolean> {
        await pauseFor(1000)
        if (password !== this.password) {
            return false
        } else {
            return true
        }
    }

    async logout (): Promise<void> {
        await pauseFor(1000)
        return
    }

    async getPaste (hash: string): Promise<Paste | null> {
        await pauseFor(1000)
        return this.pastes.get(hash) || null
    }

    async delPaste (hash: string): Promise<void> {
        await pauseFor(1000)
        this.pastes.delete(hash)
    }

    async newPaste (paste: Paste, expireAt: Date): Promise<{ hash: string }> {
        this.hash ++
        this.pastes.set(String(this.hash), paste)
        return { hash: String(this.hash) }
    }
}
