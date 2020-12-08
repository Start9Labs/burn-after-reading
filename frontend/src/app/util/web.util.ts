import { HttpErrorResponse } from '@angular/common/http'
import { fromEvent, Observable } from 'rxjs'
import { filter, tap } from 'rxjs/operators'

export async function copyToClipboard (str: string): Promise<boolean> {
  if (window.isSecureContext) {
    return navigator.clipboard.writeText(str)
      .then(() => {
        return true
      })
      .catch(err => {
        return false
      })
  } else {
    const el = document.createElement('textarea')
    el.value = str
    el.setAttribute('readonly', '')
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    const copy = document.execCommand('copy')
    document.body.removeChild(el)
    return copy
  }
}

export function isUnauthorized (e: HttpErrorResponse): boolean {
  return !!e.status && 401 === e.status
}

export function isBadRequest (e: HttpErrorResponse): boolean {
  return !!e.status && 400 === e.status
}

export function onEnterKey (input: HTMLElement): Observable<KeyboardEvent> {
  return fromEvent(input, 'keyup')
    .pipe(
      filter((e: KeyboardEvent) => e.code.toLowerCase() === 'enter' || e.keyCode === 13),
      tap(e => e.preventDefault()),
    )
}

export function isEnter (k: KeyboardEvent): boolean {
  return k.code.toLowerCase() === 'enter' || k.keyCode === 13
}