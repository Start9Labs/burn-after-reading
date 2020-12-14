import { Injectable } from '@angular/core'
import { isPlatform } from '@ionic/angular'

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  origin = window.origin
  version = require('../../../package.json').version
  appType: AppType = require('../../../fe-config.json').appType

  isMobile = isPlatform(window, 'ios') || isPlatform(window, 'android')
  isIos = isPlatform(window, 'ios')
  isAndroid = isPlatform(window, 'android')
  isConsulate = window['platform'] === 'ios'
  isDemo = this.appType === 'demo'
  isTor = isOnionTld(window.origin)

  constructor () {
    console.log('origin: ', this.origin)
    console.log('mocks: ', this.appType)
    console.log('ios: ', isPlatform(window, 'ios'))
    console.log('android: ', isPlatform(window, 'android'))
  }
}

export enum AppType {
  LIVE = 'live',
  MOCK = 'mock',
  DEMO = 'demo',
}

function isOnionTld (str: string): boolean {
  let transformed = str.trim()

  const hasProtocol = str.includes('://')
  if (!hasProtocol) {
    transformed = 'http://' + transformed
  }

  const url = new URL(transformed)
  const dotSplits = url.hostname.split('.')
  const tld = url.hostname.split('.')[dotSplits.length - 1]
  return tld === 'onion'
}
