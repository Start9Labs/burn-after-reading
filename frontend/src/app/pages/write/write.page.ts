import { Component, OnInit } from '@angular/core'
import { BehaviorSubject, fromEvent, Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { AppType, ConfigService } from 'src/app/services/config.service'
import { LoginService } from 'src/app/services/login.service'
import { LoaderService } from 'src/app/services/loader.service'
import { AuthState, AuthStore } from 'src/app/services/auth.store'
import { AlertController, ToastController } from '@ionic/angular'
import { Kila, Mega, pauseFor, readableBytes, replaceAll } from 'src/app/util/misc.util'
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
      segment, // 'message' | 'file'
      message: '',
      file: null,
      readableFileSize: '',
      contentImage: undefined,
    }
  }

  async newPaste () {
    const go = await this.alertCopyLink()
    if (go) {
      this.reset()
      this.$state$.next(WriteViewState.WRITING)
    }
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
      const imageContent = await f.arrayBuffer()
      this.upload.contentImage = this.getImageUrl(imageContent, f.type)
    }
  }

  segmentChanged () {
    this.setFile(null)
    this.upload.message = ''
  }

  async save () {
    if (this.encrypt.value && this.upload.file) {
      const go = await this.checkEncryptedFileSizeRestrictions(this.upload.file)
      if (!go) return
    }

    this.loaderService.of({
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

      const res = await this.apiService.newPaste(paste)
      this.setUrl(res.hash),
      this.$state$.next(WriteViewState.FINISHED)
      this.reset()

    }).catch(e => this.alertError(e))
  }

  dismissKeyboard () {
    console.log('dismissing')
    const d = document.getElementById('blur-me')
    return d && d.blur()
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

  private async alertCopyLink (): Promise<boolean> {
    return new Promise(async (resolve) => {
      const confirm = await this.alertController.create({
        header: 'Continue?',
        backdropDismiss: false,
        message: 'Before sharing more content, make sure you have copied the previous content address above. Without this address that content will be inaccessible!',
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
    this.url = this.config.origin + '/read/' + replaceAll(hash, '=', '%3D')
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