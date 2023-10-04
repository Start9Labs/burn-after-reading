import { Injectable } from '@angular/core'
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'
import { AlertController, ToastController } from '@ionic/angular'
import { fromEvent, Subscription } from 'rxjs'
import { filter } from 'rxjs/operators'
import { ConfigService } from '../services/config.service'
import { pauseFor } from '../util/misc.util'
import { copyToClipboard, isEnter } from '../util/web.util'

@Injectable()
export class ViewUtils {
  subs: Subscription[] = []

  constructor (
    protected readonly toastController: ToastController,
    protected readonly alertController: AlertController,
    public readonly config: ConfigService,
    protected readonly sanitizer: DomSanitizer,
  ) { }

  async copy (s: string) {
    const copied = await copyToClipboard(s)
    const t = await this.toastController.create({
      message: copied
        ? 'Successfully copied to clipboard.'
        : 'Failed to copy to clipboard.',
      duration: 2000,
    })
    t.present()
  }

  getImageUrl (a: ArrayBuffer, contentType: string): string | SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(
      new Blob(
        [a], { type: contentType },
      ),
    ))
  }

  async alertError (e: Error): Promise<void> {
    console.error(e)
    return this.alertController.create({
      header: 'Error',
      message: e.message || e.toString(),
      cssClass: 'error-alert',
    }).then(a => a.present())
  }

  cleanup (...s: Subscription[]) {
    this.subs.push(...s)
  }

  ngOnDestroy () {
    this.subs.forEach(s => s.unsubscribe())
  }
}

function arrayBufferDataURL (a: ArrayBuffer, contentType: string): string {
  return `data:${contentType};base64,${arrayBufferToBase64(a)}`
}

function arrayBufferToBase64 ( buffer: ArrayBuffer ): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[ i ])
  }
  return window.btoa( binary )
}
