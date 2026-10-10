import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of, startWith, Subject, switchMap } from 'rxjs';

import { idFromUrl, PokeApiService } from '../../service/poke-api.service';
import { PokemonListItem } from '../../models/pokeapi.model';
import { PokeSearchComponent } from '../poke-search/poke-search.component';
import { PokeCardComponent } from '../poke-card/poke-card.component';
import { InViewportDirective } from '../directives/in-viewport.directive';

/** Cards added per page while scrolling. */
const PAGE_SIZE = 24;

/** Number of placeholder cards shown while the index is loading. */
const SKELETON_CARDS = 12;

/** Matches by Pokédex number for `25` / `#25`, otherwise by name substring. */
function matcher(query: string): (entry: PokemonListItem) => boolean {
  const q = query.trim().toLowerCase();
  if (/^#?\d+$/.test(q)) {
    const id = Number(q.replace('#', ''));
    return (entry) => idFromUrl(entry.url) === id;
  }
  return (entry) => entry.name.includes(q);
}

@Component({
  selector: 'poke-list',
  imports: [PokeSearchComponent, PokeCardComponent, InViewportDirective],
  templateUrl: './poke-list.component.html',
  styleUrls: ['./poke-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeListComponent {
  private readonly pokeApiService = inject(PokeApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly reload$ = new Subject<void>();

  protected readonly apiError = signal(false);
  /** The search lives in `?q=`, so it survives going to a detail page and back. */
  protected readonly query = signal(this.route.snapshot.queryParamMap.get('q') ?? '');
  protected readonly pageSize = PAGE_SIZE;
  protected readonly limit = signal(PAGE_SIZE);
  protected readonly skeletons = Array.from({ length: SKELETON_CARDS }, (_, i) => i);

  /** Full species index; `undefined` while loading. */
  private readonly index = toSignal(
    this.reload$.pipe(
      startWith(undefined),
      switchMap(() =>
        this.pokeApiService.index().pipe(
          startWith(undefined),
          catchError(() => {
            this.apiError.set(true);
            return of<PokemonListItem[]>([]);
          }),
        ),
      ),
    ),
  );

  /** Every Pokémon matching the search — the whole index, not just the rendered cards. */
  protected readonly results = computed(() => {
    const index = this.index();
    if (!index) {
      return undefined;
    }
    return this.query().trim() ? index.filter(matcher(this.query())) : index;
  });

  protected readonly visible = computed(() => this.results()?.slice(0, this.limit()) ?? []);
  protected readonly hasMore = computed(() => (this.results()?.length ?? 0) > this.limit());

  onSearch(value: string): void {
    this.query.set(value);
    this.limit.set(PAGE_SIZE);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: value.trim() || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  loadMore(): void {
    if (this.hasMore()) {
      this.limit.update((limit) => limit + PAGE_SIZE);
    }
  }

  retry(): void {
    this.apiError.set(false);
    this.reload$.next();
  }
}
