import { Pipe, PipeTransform } from '@angular/core';

/** Formats a National Pokédex id as `#001`. */
@Pipe({
  name: 'dexNumber',
})
export class DexNumberPipe implements PipeTransform {
  transform(id: number): string {
    return `#${String(id).padStart(3, '0')}`;
  }
}
