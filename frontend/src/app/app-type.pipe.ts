import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'appType'
})
export class AppTypePipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
