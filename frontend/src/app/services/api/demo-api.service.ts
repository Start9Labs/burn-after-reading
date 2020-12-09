import { Kila } from '../../util/misc.util'
import { AuthStore } from '../auth.store'
import { Paste } from '../paste/paste'
import { LiveApi } from './live-api.service'

export class DemoApi extends LiveApi {
    constructor (authStore: AuthStore) { super(authStore) }

    async newPaste (paste: Paste): Promise<{ hash: string }> {
        if (paste.contentType !== 'text/plain') throw new Error('This demo only supports text uploads.')
        if (paste.size >= 10 * Kila) throw new Error('This demo only uploads up to 10 KiB')
        return super.newPaste(paste)
    }
}
