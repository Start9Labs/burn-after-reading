import { Component, OnInit, Sanitizer } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { AlertController, ModalController, ToastController } from '@ionic/angular'
import { BehaviorSubject, Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ApiService } from 'src/app/services/api/api.service'
import { LoaderService, markAsLoadingDuringP } from 'src/app/services/loader.service'
import { Paste } from 'src/app/services/paste/paste'
import { pauseFor, readableBytes } from 'src/app/util/misc.util'
import { ViewUtils } from '../view-utils'
const mime = require('mime')
import { ConfigService } from 'src/app/services/config.service'
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'
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
    private readonly loader: LoaderService,
    public readonly config: ConfigService,
    private readonly sanitizer: DomSanitizer,
    toastController: ToastController,
    alertController: AlertController,
  ) {
    super(toastController, alertController)
  }
  ngOnInit () {
    this.readId = this.route.snapshot.paramMap.get('id') as string

    this.loader.of({
      spinner: 'lines',
      message: 'This could take a while...',
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
    this.loader.displayDuringP(
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
    this.loader.displayDuringAsync(
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
    return this.loader.displayDuringP(
      this.deletePaste(),
    ).then(t => t && this.burnTransition())
    .catch(e => this.alertError(e))
    .finally(() => this.burning = false)
  }

  async downloadBlob () {
    let title: string
    const extension = mime.getExtension(this.presentableContent.contentType)
    if (!this.presentableContent || this.presentableContent.title === '') {
      title = `BAR-${(new Date()).toISOString()}.${extension}`
    } else {
      title = this.presentableContent.title
    }

    try {
      const link = document.createElement('a')
      const blob = new Blob([this.presentableContent.content], {
        type: this.presentableContent.contentType,
      })
      if (this.config.isConsulate) {
        link.href = await blobToBase64(blob)
      } else {
        link.href = URL.createObjectURL(blob)
      }

      link.download = title

      if (this.config.isConsulate) {
        // do this so that WKWebview can find this link to look up its title
        document.body.append(link)
      }

      link.click()
    } catch (e) {
      this.alertError(new Error(`Download failed: ${e}`))
    }
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

  private getImageUrl (a: ArrayBuffer, contentType: string): string | SafeUrl {
    if (this.config.isConsulate) {
      return this.sanitizer.bypassSecurityTrustUrl(arrayBufferDataURL(a, contentType))
    } else {
      return this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(
        new Blob(
          [a], { type: contentType },
        ),
      ))
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
