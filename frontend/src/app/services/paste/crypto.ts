export async function isEncrypted (buffer: ArrayBuffer): Promise<boolean> {
    const hash = new Uint8Array(buffer.slice(0, 32))
    for (let byteIdx of hash) {
        if (hash[byteIdx] !== 0) {
            return true
        }
    }
    return false
}

export async function checkPassword (arrayBuffer: ArrayBuffer, password: string): Promise<boolean> {
    const expectedHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)))
    const hash = new Uint8Array(arrayBuffer)
    expectedHash.forEach( (byte, index) => {
        if (hash[index] !== byte) {
            return false
        }
    })
    return true
}

export async function encryptArrayBuffer (buf: ArrayBuffer, password?: string): Promise<ArrayBuffer> {
    if (password) {
        const iv = crypto.getRandomValues(new Uint8Array(16))
        // passwordHash + iv + message
        const arr = new Uint8Array(32 + iv.length + buf.byteLength)

        const passBytes = new TextEncoder().encode(password)
        const passHash = new Uint8Array(await crypto.subtle.digest('SHA-256', passBytes))

        arr.set(passHash)
        arr.set(iv, passHash.byteLength)
        const keyMaterial = await crypto.subtle.importKey('raw', passBytes, 'PBKDF2', false, ['deriveKey', 'deriveBits'])
        const key = await crypto.subtle.deriveKey(
            {
              name: 'PBKDF2',
              salt: new Uint8Array(16),
              iterations: 100000,
              hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-CTR', length: 256 },
            true,
            ['encrypt', 'decrypt'],
          )
        const enc = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CTR', counter: iv, length: 64 }, key, buf))
        arr.set(enc, passHash.length + iv.length)
        return arr
    } else {
        const arr = new Uint8Array(32 + buf.byteLength)
        arr.set(new Uint8Array(buf), 32)
        return arr
    }
}

export async function decryptArrayBuffer (buf: ArrayBuffer, password?: string): Promise<ArrayBuffer> {
    const arr = new Uint8Array(buf)
    if (password) {
        // arr = passwordHash(32) + iv(16) + encrypted message
        const passBytes = new TextEncoder().encode(password)
        const passHash = new Uint8Array(await crypto.subtle.digest('SHA-256', passBytes))

        for (let byteIdx in arr.slice(0, 32)) {
            if (arr[byteIdx] !== passHash[byteIdx]) {
                throw new Error('password incorrect')
            }
        }

        const iv = arr.slice(32, 48)
        const keyMaterial = await crypto.subtle.importKey('raw', passBytes, 'PBKDF2', false, ['deriveKey', 'deriveBits'])
        const key = await crypto.subtle.deriveKey(
            {
              name: 'PBKDF2',
              salt: new Uint8Array(16),
              iterations: 100000,
              hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-CTR', length: 256 },
            true,
            ['encrypt', 'decrypt'],
          )

        // arr.slice(48) is the encrypted message
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-CTR', counter: iv, length: 64 }, key, arr.slice(48))
        return decrypted
    } else {
        for (let byteIdx in arr.slice(0, 32)) {
            if (arr[byteIdx] !== 0) {
                throw new Error('password required')
            }
        }
        return arr.slice(32)
    }
}