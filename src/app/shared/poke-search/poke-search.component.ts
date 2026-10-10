import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  signal,
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
  host: {
    '(document:keydown)': 'onShortcut($event)',
  },
})
export class PokeSearchComponent {
  private readonly input$ = new Subject<string>();
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** The current search as known outside (the URL); shown when it changes from outside. */
  readonly value = input('');

  readonly term = outputFromObservable(this.input$.pipe(debounceTime(DEBOUNCE_MS)));

  /** Whether the field has text (shows the clear button instead of the `/` hint). */
  protected readonly hasText = signal(false);

  constructor() {
    effect(() => {
      const value = this.value();
      const field = this.field().nativeElement;
      // Never overwrite what the user is typing: while focused, the field is the source.
      if (document.activeElement !== field && field.value.trim() !== value) {
        field.value = value;
      }
      this.hasText.set(field.value !== '');
    });
  }

  onSearch(value: string): void {
    this.hasText.set(value !== '');
    this.input$.next(value);
  }

  protected clear(): void {
    const field = this.field().nativeElement;
    field.value = '';
    field.focus();
    this.onSearch('');
  }

  /** `/` focuses the search from anywhere on the page, unless the user is typing somewhere. */
  protected onShortcut(event: KeyboardEvent): void {
    const target = event.target;
    const typing = target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]');
    if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.field().nativeElement.focus();
    }
  }
}
