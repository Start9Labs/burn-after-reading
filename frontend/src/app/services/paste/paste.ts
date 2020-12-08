import { checkPassword, decryptArrayBuffer, isEncrypted } from './crypto'
export class Paste {
  readonly encrypted: Promise<boolean>
  readonly size: number

  constructor (
    public readonly contentType: string,
    public readonly content: ArrayBuffer,
  ) {
    this.encrypted = isEncrypted(content)
    this.size = content.byteLength
  }

  checkPassword (password: string): Promise<boolean> {
    return checkPassword(this.content, password)
  }

  async decrypted (password?: string): Promise<ArrayBuffer> {
    return decryptArrayBuffer(this.content, password)
  }
}

export function addPrefix (a: ArrayBuffer, prefix: string): ArrayBuffer {
  const t = new TextEncoder()
  const titleEncoded = t.encode(prefix).slice(0, 255)
  const contentBytes = new Uint8Array(a)
  const titlePrefix = Uint8Array.from([titleEncoded.length])

  const toReturn = new Uint8Array(titlePrefix.length + titleEncoded.length + contentBytes.length)
  toReturn.set(titlePrefix)
  toReturn.set(titleEncoded, titlePrefix.length)
  toReturn.set(contentBytes, titlePrefix.length + titleEncoded.length)
  return toReturn
}