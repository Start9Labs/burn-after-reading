export function pauseFor (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function replaceAll (theString: string, what: string, withWhat: string): string {
  return theString.split(what).join(withWhat)
}

export const chill = () => { }
export const chillAsync = async () => { }

export const Kila = 1 << 10
export const Mega = 1 << 20
export const Giga = 1 << 30

export function readableBytes (b: number): string {
  if (b > Giga) {
    return `${(b / Giga).toFixed(2)} GiB`
  }
  if (b > Mega) {
    return `${(b / Mega).toFixed(2)} MiB`
  }
  if (b > Kila) {
    return `${(b / Kila).toFixed(2)} KiB`
  }
  return `${b} B`
}

export function modulateTime (ts: Date, count: number, unit: 'days' | 'hours' | 'minutes' | 'seconds' ): Date {
  const ms = inMs(count, unit)
  const toReturn = new Date(ts)
  toReturn.setMilliseconds( toReturn.getMilliseconds() + ms)
  return toReturn
}

export function inMs ( count: number, unit: 'days' | 'hours' | 'minutes' | 'seconds' ): number {
  switch (unit){
    case 'seconds' : return count * 1000
    case 'minutes' : return inMs(count * 60, 'seconds')
    case 'hours' : return inMs(count * 60, 'minutes')
    case 'days' : return inMs(count * 24, 'hours')
  }
}
