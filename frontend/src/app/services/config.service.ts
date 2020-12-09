import { Injectable } from '@angular/core'
import { isPlatform } from '@ionic/angular'

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  origin = removeProtocol(window.origin)
  version = require('../../../package.json').version
  appType: AppType = require('../../../fe-config.json').appType
  isMobile = isPlatform(window, 'ios') || isPlatform(window, 'android')
  isIos = isPlatform(window, 'ios')
  isAndroid = isPlatform(window, 'android')
  isConsulate = window['platform'] === 'ios'
  isDemo = this.appType === 'demo'

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

function removeProtocol (str: string): string {
  if (str.includes('://')) {
    return str.split('://')[1]
  }
  return str
}

