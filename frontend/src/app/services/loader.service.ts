import { Injectable } from '@angular/core'
import { concatMap, finalize } from 'rxjs/operators'
import { Observable, from, Subject } from 'rxjs'
import { fromAsync$, fromAsyncP, emitAfter$, fromSync$ } from '../util/rxjs.util'
import { LoadingController } from '@ionic/angular'
import { LoadingOptions } from '@ionic/core'

// waitFor allows us to specify how long (ms) to wait before showing the spinner to prevent
// flickering if requests go quickly.
type LoaderServiceOptions = LoadingOptions & { waitFor?: number }
@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  private loaderOptions: LoaderServiceOptions = defaultOptions()
  constructor (private readonly loadingCtrl: LoadingController) { }

  private loader: HTMLIonLoadingElement

  public get ionLoader (): HTMLIonLoadingElement {
    return this.loader
  }

  public get ctrl () {
    return this.loadingCtrl
  }

  private setOptions (l: LoaderServiceOptions): LoaderService {
    this.loaderOptions = l
    return this
  }

  of (overrideOptions: LoaderServiceOptions): LoaderService {
    return new LoaderService(this.loadingCtrl).setOptions(Object.assign(defaultOptions(), overrideOptions))
  }

  displayDuring$<T> (o: Observable<T>): Observable<T> {
    let shouldDisplay = true
    const displayIfItsBeenAtLeast = this.loaderOptions.waitFor || 10
    return fromAsync$(
      async () => {
        this.loader = await this.loadingCtrl.create(this.loaderOptions)
        emitAfter$(displayIfItsBeenAtLeast).subscribe(() => { if (shouldDisplay) this.loader.present() })
      },
    ).pipe(
      concatMap(() => o),
      finalize(() => {
        this.loader.dismiss(); shouldDisplay = false; this.loader = undefined
       }),
    )
  }

  displayDuringP<T> (p: Promise<T>): Promise<T> {
    return this.displayDuring$(from(p)).toPromise()
  }

  displayDuringAsync<T> (thunk: () => Promise<T>): Promise<T> {
    return this.displayDuringP(fromAsyncP(thunk))
  }
}

export function markAsLoadingDuring$<T> ($trigger$: Subject<boolean>, o: Observable<T>): Observable<T> {
  let shouldBeOn = true
  const displayIfItsBeenAtLeast = 5 // ms
  return fromSync$(() => {
    emitAfter$(displayIfItsBeenAtLeast).subscribe(() => { if (shouldBeOn) $trigger$.next(true) })
  }).pipe(
    concatMap(() => o),
    finalize(() => {
      $trigger$.next(false)
      shouldBeOn = false
    }),
 )
}

export function markAsLoadingDuringP<T> ($trigger$: Subject<boolean>, p: Promise<T>): Promise<T> {
  return markAsLoadingDuring$($trigger$, from(p)).toPromise()
}

export function markAsLoadingDuringAsync<T> ($trigger$: Subject<boolean>, thunk: () => Promise<T>): Promise<T> {
  return markAsLoadingDuringP($trigger$, fromAsyncP(thunk))
}


const defaultOptions: () => LoaderServiceOptions = () => ({
  spinner: 'lines',
  cssClass: 'loader',
  backdropDismiss: true,
  waitFor: 10,
})
