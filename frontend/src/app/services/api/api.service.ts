import { Paste } from '../paste/paste'

export abstract class ApiService {
  abstract login (password: string): Promise<boolean>
  abstract logout (): Promise<void>
  abstract getPaste (hash: string): Promise<Paste | null>
  abstract delPaste (hash: string): Promise<void>
  abstract newPaste (paste: Paste, expireAt: Date): Promise<{ hash: string }>

  async initialize (): Promise<any> { }
}





export type Unit = { never?: never; } // hack for the unit typ
