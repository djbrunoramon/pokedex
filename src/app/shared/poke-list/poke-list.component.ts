import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, startWith, Subject, switchMap } from 'rxjs';

import { PokeApiService } from '../../service/poke-api.service';
import { PokemonWithDetail } from '../../models/pokeapi.model';
import { PokeSearchComponent } from '../poke-search/poke-search.component';
import { PokeCardComponent } from '../poke-card/poke-card.component';

/** Number of placeholder cards shown while the list is loading. */
const SKELETON_CARDS = 12;

@Component({
  selector: 'poke-list',
  imports: [PokeSearchComponent, PokeCardComponent],
  templateUrl: './poke-list.component.html',
  styleUrls: ['./poke-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeListComponent {
  private readonly pokeApiService = inject(PokeApiService);
  private readonly reload$ = new Subject<void>();

  protected readonly apiError = signal(false);
  protected readonly query = signal('');
  protected readonly skeletons = Array.from({ length: SKELETON_CARDS }, (_, i) => i);

  /** `undefined` while the list is loading. */
  private readonly allPokemons = toSignal(
    this.reload$.pipe(
      startWith(undefined),
      switchMap(() =>
        this.pokeApiService.listWithDetails().pipe(
          startWith(undefined),
          catchError(() => {
            this.apiError.set(true);
            return of<PokemonWithDetail[]>([]);
          }),
        ),
      ),
    ),
  );

  protected readonly pokemons = computed(() => {
    const all = this.allPokemons();
    if (!all) {
      return undefined;
    }

    const q = this.query().trim().toLowerCase();
    return all.filter((pokemon) => pokemon.detail && pokemon.name.startsWith(q));
  });

  onSearch(value: string): void {
    this.query.set(value);
  }

  retry(): void {
    this.apiError.set(false);
    this.reload$.next();
  }
}
