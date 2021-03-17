import { Component, OnInit } from '@angular/core'
import { BehaviorSubject, fromEvent, Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { AppType, ConfigService } from 'src/app/services/config.service'
import { LoginService } from 'src/app/services/login.service'
import { LoaderService } from 'src/app/services/loader.service'
import { AuthState, AuthStore } from 'src/app/services/auth.store'
import { AlertController, ToastController } from '@ionic/angular'
import { Kila, Mega, modulateTime, pauseFor, readableBytes, replaceAll } from 'src/app/util/misc.util'
import { addPrefix, Paste } from 'src/app/services/paste/paste'
import { ApiService } from 'src/app/services/api/api.service'
import { ViewUtils } from '../view-utils'
import { encryptArrayBuffer } from 'src/app/services/paste/crypto'
import { isEnter } from 'src/app/util/web.util'
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'

export enum WriteViewState {
  UNAUTH,
  WRITING,
  FINISHED,
}

@Component({
  selector: 'app-write',
  templateUrl: './write.page.html',
  styleUrls: ['./write.page.scss'],
})
export class WritePage extends ViewUtils implements OnInit {
  $state$: BehaviorSubject<WriteViewState> = new BehaviorSubject(WriteViewState.UNAUTH)
  shields$: Observable<boolean> = this.$state$.asObservable().pipe(map(s => s !== WriteViewState.WRITING))

  WriteViewState = WriteViewState
  AppType = AppType

  iosKeyboardOpen = false

  auth: { value: string, masked: boolean }
  encrypt: { value: string, masked: boolean }
  upload: {
    segment: 'message' | 'file',
    message: string,
    file: File,
    readableFileSize: string
    contentImage?: string | SafeUrl
  }

  url: string

  expirationOptions: { [key: string]: ExpirationOption }
  selectedExpiration: string //a key of the above

  constructor (
    config: ConfigService,
    private readonly loginService: LoginService,
    private readonly loaderService: LoaderService,
    private readonly authStore: AuthStore,
    private readonly apiService: ApiService,
    sanitizer: DomSanitizer,
    alertController: AlertController,
    toastController: ToastController,
  ) { super(toastController, alertController, config, sanitizer) }

  ngOnInit () {
    this.expirationOptions = {
      minutes: { display: '10 minutes', count: 10, unit: 'minutes' },
      hours: { display: '6 Hours', count: 6, unit: 'hours' },
      day: { display: '1 Day', count: 1, unit: 'days' },
      someDays: { display: '3 Days', count: 3, unit: 'days', disabled: this.config.isDemo },
      week: { display: '1 Week', count: 7, unit: 'days', disabled: this.config.isDemo },
    }
    this.selectedExpiration = 'day'

    this.reset()
    if (this.config.isIos) {
      this.cleanup(
        fromEvent(window, 'ionKeyboardDidShow').subscribe(() => {
          this.iosKeyboardOpen = true
        }),
        fromEvent(window, 'ionKeyboardDidHide').subscribe(() => {
          this.iosKeyboardOpen = false
        }),
      )
    }
    this.cleanup(
      this.authStore.listen({
        [AuthState.UNVERIFIED]: () => {
          this.$state$.next(WriteViewState.UNAUTH)
        },
        [AuthState.VERIFIED]: () => {
          this.$state$.next(WriteViewState.WRITING)
        },
      }),
    )

    if (this.config.isDemo) {
      return pauseFor(500).then(() => this.alertDemo())
    }
  }

  loginOnEnter (event: KeyboardEvent) {
    if (isEnter(event)) {
      return this.login()
    }
  }

  reset (segment: 'message' | 'file'  = 'message') {
    this.auth = {
      value: '',
      masked: true,
    }

    this.encrypt = {
      value: '',
      masked: true,
    }

    this.upload = {
      segment,
      message: '',
      file: null,
      readableFileSize: '',
      contentImage: undefined,
    }
  }

  async newPaste () {
    this.reset()
    this.$state$.next(WriteViewState.WRITING)
  }

  ngOnDestroy () {
    this.subs.forEach(s => s.unsubscribe())
  }

  login () {
    return this.loaderService.displayDuringP(
      this.loginService.login(this.auth.value),
    ).catch(e => {
      return this.alertError(e)
    }).finally(() => {
      this.auth.value = ''
      this.auth.masked = true
    })
  }

  logout () {
    return this.loaderService.displayDuringP(
      this.loginService.logout(),
    ).then(() => {
      this.reset()
    }).catch(e => {
      return this.alertError(e)
    })
  }

  async presentAlertEncrypt () {
    const alert = await this.alertController.create({
      header: 'Encrypt',
      message: 'You may encrypt your message/file with a secret passphrase. Encryption is performed in the browser before being sent to the server. This passphrase will be required to decrypt the message/file.',
      buttons: ['Close'],
    })

    await alert.present()
  }

  async presentAlertEncryptionRequired () {
    const alert = await this.alertController.create({
      header: 'Encryption Required',
      message: 'You must encrypt your message/file in this demo',
      cssClass: 'error-alert'
    })

    await alert.present()
  }

  handleFileDrop (e: any) {
    const files = e.dataTransfer.files
    if (!files) return
    this.setFile([...files][0])
  }

  handleFileInput (e: any) {
    const files = e.target.files
    if (!files) return
    this.setFile([...files][0])
  }

  async setFile (f?: File) {
    if (!f) {
      this.upload.file = null
      this.upload.readableFileSize = ''
      return
    }

    const satisfies = await this.checkFileSizeRestrictions(f)
    if (!satisfies) return

    this.upload.file = f
    this.upload.readableFileSize = readableBytes(f.size)
    if (this.upload.file.type.startsWith('image')) {
      const imageContent = await fileToArrayBuffer(f)
      this.upload.contentImage = this.getImageUrl(imageContent, f.type)
    }
  }

  segmentChanged () {
    this.setFile(null)
    this.upload.message = ''
  }

  async save () {
    if (this.config.isDemo && !this.encrypt.value) {
      return this.presentAlertEncryptionRequired()
    }

    if (this.encrypt.value && this.upload.file) {
      const go = await this.checkEncryptedFileSizeRestrictions(this.upload.file)
      if (!go) return
    }

    return this.loaderService.of({
      spinner: 'lines',
      message: 'This could take a while...',
      waitFor: 250,
    }).displayDuringAsync(async () => {
      let content: ArrayBuffer
      let contentType: string

      if (this.upload.segment === 'file') {
        content = addPrefix(await fileToArrayBuffer(this.upload.file), this.upload.file.name)
        contentType = this.upload.file.type
      } else {
        const t = new TextEncoder()
        content = addPrefix(t.encode(this.upload.message), '')
        contentType = 'text/plain'
      }

      const paste = new Paste(
        contentType,
        await encryptArrayBuffer(content, this.encrypt.value),
      )

      const res = await this.apiService.newPaste(paste, this.getExpireAt())
      this.setUrl(res.hash),
      this.$state$.next(WriteViewState.FINISHED)
      this.reset()
    }).catch(e => this.alertError(e))
  }

  dismissKeyboard () {
    const d = document.getElementById('blur-me')
    return d && d.blur()
  }

  getExpireAt (): Date {
    const now = new Date()
    const { count, unit} = this.expirationOptions[this.selectedExpiration]
    return modulateTime(now, count, unit)
  }

  asIsOrder () {
    return 0
  }

  private async checkEncryptedFileSizeRestrictions (f: File): Promise<boolean> {
    if (f.size >= FileTShirtSize.MEDIUM) {
      return this.alertFilesizeCaution()
    }
    return true
  }

  private async checkFileSizeRestrictions (f: File): Promise<boolean> {
    if (f.size >= FileTShirtSize.LARGE) {
      await this.alertError(new Error(
        'Files must be fewer than 50 MiB',
      ))
      return false
    }
    return true
  }

  private async alertFilesizeCaution (): Promise<boolean> {
    return new Promise(async (resolve) => {
      const confirm = await this.alertController.create({
        backdropDismiss: false,
        header: 'Caution',
        message: 'It might take a while to encrypt a file of this size, are you sure you wish to continue?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              return resolve(false)
            },
          },
          {
            text: 'Continue',
            handler: () => {
              return resolve(true)
            },
          },
        ],
      })

      await confirm.present()
    })
  }

  private setUrl (hash: string) {
    let loc = this.config.origin
    let base = loc.endsWith('.local') ? loc.replace('.local','.onion').replace('https://', 'http://') : loc
    this.url = base + '/read/' + replaceAll(hash, '=', '%3D')
  }
}

async function fileToArrayBuffer (f: File): Promise<ArrayBuffer> {
  const reader = new FileReader()
  reader.readAsArrayBuffer(f)
  return new Promise(resolve => {
    reader.onloadend = () => {
      resolve(reader.result as ArrayBuffer)
    }
  })
}

export enum FileTShirtSize {
  SMALL = 1,
  DEMO_LARGE = 10 * Kila,
  MEDIUM = 2.5 * Mega,
  LARGE = 50 * Mega,
}

type ExpirationOption = {
  display: string,
  unit: 'days' | 'hours' | 'minutes' | 'seconds',
  count: number,
  disabled?: boolean
}