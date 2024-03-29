import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { AlertController, ToastController } from '@ionic/angular'
import { BehaviorSubject, Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api/api.service'
import { LoaderService } from 'src/app/services/loader.service'
import { Paste } from 'src/app/services/paste/paste'
import { pauseFor, readableBytes, replaceAll } from 'src/app/util/misc.util'
import { ViewUtils } from '../view-utils'
const mime = require('mime')
import { ConfigService } from 'src/app/services/config.service'
import { DomSanitizer } from '@angular/platform-browser'
import { isEnter } from 'src/app/util/web.util'

export enum ReadViewState {
  LOADING,
  ENCRYPTED,
  NOT_ENCRYPTED,
  VIEWING,
  BURNED,
}
@Component({
  selector: 'app-read',
  templateUrl: './read.page.html',
  styleUrls: ['./read.page.scss'],
})
export class ReadPage extends ViewUtils implements OnInit {
  ReadViewState = ReadViewState
  $state$: BehaviorSubject<ReadViewState> = new BehaviorSubject(ReadViewState.LOADING)
  shields$: Observable<boolean> = this.$state$.asObservable().pipe(map(s => s !== ReadViewState.VIEWING))

  decrypt: { value: string, masked: boolean } = { value: '', masked: true }

  presentableContent: PresentablePaste
  rawContent: Paste
  deleted = false

  readId: string

  burnup = false

  constructor (
    private readonly apiService: ApiService,
    private readonly route: ActivatedRoute,
    private readonly loaderService: LoaderService,
    config: ConfigService,
    sanitizer: DomSanitizer,
    toastController: ToastController,
    alertController: AlertController,
  ) {
    super(toastController, alertController, config, sanitizer)
  }

  ngOnInit () {
    this.readId = this.route.snapshot.paramMap.get('id') as string
    this.preProcesses()
  }

  async preProcesses () {
    return this.loaderService.of({
      spinner: 'lines',
      message: 'This could take a while...',
      waitFor: 250,
    }).displayDuringP(this.fetchPaste())
  }

  async fetchPaste () {
    return this.apiService.getPaste(this.readId).then(async p => {
      this.rawContent = p
      if (p && await p.encrypted) {
        this.$state$.next(ReadViewState.ENCRYPTED)
      } else if (p) {
        this.$state$.next(ReadViewState.NOT_ENCRYPTED)
      } else {
        this.$state$.next(ReadViewState.BURNED)
      }
    })
    .catch(e =>
      this.alertError(e),
    )
  }

  async viewContent () {
    this.loaderService.displayDuringP(
      this.rawContent.decrypted(),
    ).then(content => {
      this.setContent(content, this.rawContent.contentType)
      this.$state$.next(ReadViewState.VIEWING)
    })
    .catch(
      e => this.alertError(e),
    )
  }

  decryptOnEnter (event: KeyboardEvent) {
    if (isEnter(event)) {
      return this.decryptContent()
    }
  }

  async decryptContent () {
    this.loaderService.displayDuringAsync(
      async () => {
        try {
          const valid = await this.rawContent.checkPassword(this.decrypt.value)
          if (valid) {
            this.setContent(
              await this.rawContent.decrypted(this.decrypt.value), this.rawContent.contentType,
            )
            this.$state$.next(ReadViewState.VIEWING)
          } else {
            this.alertError(new Error('Invalid Password'))
          }
        } catch (e) {
          this.alertError(e)
        }
      },
    )
  }

  setContent (decryptedContent: ArrayBuffer, contentType: string) {
    this.presentableContent = this.toPresentablePaste(decryptedContent, contentType)
    // don't block on this, but we delete it now as the data is fully cached in memory on the previous line
    this.deletePaste()
  }

  async burnTransition () {
    this.burnup = true
    await pauseFor(1000)
    this.$state$.next(ReadViewState.BURNED)
    this.presentableContent = undefined
  }

  async deletePaste (): Promise<boolean> {
    if (this.deleted) return true
    return this.apiService.delPaste(this.readId)
      .then(() => { this.deleted = true; return true })
      .catch(e => {
        this.alertError(new Error('Unable to burn content: ' + e.message))
        return false
    } )
  }

  burning = false
  async burnNow () {
    if (this.burning) return
    this.burning = true
    // if for whatever reason the data hasn't be deleted yet...
    return this.loaderService.displayDuringP(
      this.deletePaste(),
    ).then(t => t && this.burnTransition())
    .catch(e => this.alertError(e))
    .finally(() => this.burning = false)
  }

  async downloadBlob () {
    let title: string
    const extension = mime.getExtension(this.presentableContent.contentType)
    if (!this.presentableContent || this.presentableContent.title === '') {
      title = `BAR-${replaceAll((new Date()).toLocaleDateString(), '/', '-')}.${extension}`
    } else {
      title = this.presentableContent.title
    }

    try {
      const link = document.createElement('a')
      const blob = new Blob([this.presentableContent.content], {
        type: this.presentableContent.contentType,
      })

      link.href = URL.createObjectURL(blob)
      link.download = title

      link.click()
    } catch (e) {
      this.alertError(new Error(`Download failed: ${e}`))
    }
  }

  toWritePage() {
    const a = document.createElement('a')
    const site = this.config.origin + '/write'
    a.href = site
    a.target = '_blank'
    a.click()
  }

  private toPresentablePaste (a: ArrayBuffer, contentType: string): PresentablePaste {
    const t = new TextDecoder()
    const titleLength = new Uint8Array(a.slice(0, 1))[0]
    const size = a.byteLength
    const title = t.decode(a.slice(1, 1 + titleLength))
    const content = a.slice(1 + titleLength)
    const readableSize = readableBytes(size)

    let contentMessage = undefined
    let contentImage = undefined
    if (contentType === 'text/plain' && (!title || title.trim() === '')) {
      contentMessage = t.decode(content)
    } else if (contentType.startsWith('image')) {
      contentImage = this.getImageUrl(content, contentType)
    }

    return {
      title,
      content,
      size,
      contentType,
      contentMessage,
      readableSize,
      contentImage,
    }
  }
}

type PresentablePaste = {
  title: string;
  content: ArrayBuffer;
  size: number;
  readableSize: string,
  contentType: string;
  contentMessage?: string; //when its text/plain and no title, means they probs handwrote it
  contentImage?: string //when it's an image, base64 encode it for a src
}

function blobToBase64 (blob: Blob): Promise<string> {
  const reader = new FileReader()
  reader.readAsDataURL(blob)
  return new Promise(resolve => {
    reader.onloadend = () => {
      resolve(reader.result as string)
    }
  })
}

