import { Injectable, Input } from '@angular/core'
import { AlertController, ToastController } from '@ionic/angular'
import { fromEvent, Observable, Subscription } from 'rxjs'
import { filter } from 'rxjs/operators'
import { copyToClipboard } from '../util/web.util'

@Injectable()
export class ViewUtils {
  subs: Subscription[] = []

  constructor (
    protected readonly toastController: ToastController,
    protected readonly alertController: AlertController,
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