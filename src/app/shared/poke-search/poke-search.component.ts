import { ChangeDetectionStrategy, Component } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

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

  readonly term = outputFromObservable(
    this.input$.pipe(debounceTime(DEBOUNCE_MS), distinctUntilChanged()),
  );

  onSearch(value: string): void {
    this.input$.next(value);
  }
}
