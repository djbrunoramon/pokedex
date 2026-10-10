import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { debounceTime, Subject } from 'rxjs';

/** Wait for a pause in typing so each keystroke doesn't mount (and fetch) a new page of cards. */
const DEBOUNCE_MS = 150;

@Component({
  selector: 'poke-search',
  templateUrl: './poke-search.component.html',
  styleUrls: ['./poke-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeSearchComponent {
  private readonly input$ = new Subject<string>();
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** The current search as known outside (the URL); shown when it changes from outside. */
  readonly value = input('');

  readonly term = outputFromObservable(this.input$.pipe(debounceTime(DEBOUNCE_MS)));

  constructor() {
    effect(() => {
      const value = this.value();
      const field = this.field().nativeElement;
      // Never overwrite what the user is typing: while focused, the field is the source.
      if (document.activeElement !== field && field.value.trim() !== value) {
        field.value = value;
      }
    });
  }

  onSearch(value: string): void {
    this.input$.next(value);
  }
}
