import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import { chill } from '../util/misc.util'
import { markAsLoadingDuringP } from './loader.service'

@Injectable({
  providedIn: 'root',
})
export class BeforeViewService {
  private $processing$ = new BehaviorSubject(false)
  constructor ( ) { }

  prime () {
    this.$processing$.next(true)
  }

  whenReady$ (): Observable<boolean> {
    return this.$processing$.pipe(map(t => !t))
  }

  task<T> (t: Promise<T>): Promise<T> {
    return markAsLoadingDuringP(this.$processing$, t)
  }
}
