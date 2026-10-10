import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';

import { idFromUrl, PokeApiService } from '../../service/poke-api.service';
import { PokemonListItem } from '../../models/pokeapi.model';
import { PokeSearchComponent } from '../poke-search/poke-search.component';
import { PokeCardComponent } from '../poke-card/poke-card.component';
import { InViewportDirective } from '../directives/in-viewport.directive';

/** Cards added per page while scrolling. */
const PAGE_SIZE = 24;

/** Cards in the first rows, whose images are loaded eagerly. */
const PRIORITY_CARDS = 6;

/** Number of placeholder cards shown while the index is loading. */
const SKELETON_CARDS = 12;

/** History state of the list's entry: how many cards were loaded, restored on coming back. */
interface ListHistoryState {
  listLimit?: number;
}

/** Matches by Pokédex number for `25` / `#25`, otherwise by name substring. */
function matcher(query: string): (entry: PokemonListItem) => boolean {
  const q = query.trim().toLowerCase();
  if (/^#?\d+$/.test(q)) {
    const id = Number(q.replace('#', ''));
    return (entry) => idFromUrl(entry.url) === id;
  }
  return (entry) => entry.name.includes(q);
}

/** Most look-alike names suggested when a search has no exact match. */
const MAX_SUGGESTIONS = 12;

/**
 * Names within a couple of typos of the query (`pikachuu`, `charmender`), closest first —
 * compared with the whole name and with its start, so a misspelled partial name also works.
 * Only for names: a number either exists or not.
 */
function lookAlikes(index: PokemonListItem[], query: string): PokemonListItem[] {
  const q = query.trim().toLowerCase();
  if (q.length < 3 || /^#?\d+$/.test(q)) {
    return [];
  }
  const maxTypos = q.length <= 5 ? 1 : 2;
  return index
    .map((entry) => ({
      entry,
      typos: Math.min(editDistance(q, entry.name), editDistance(q, entry.name.slice(0, q.length))),
    }))
    .filter(({ typos }) => typos <= maxTypos)
    .sort((a, b) => a.typos - b.typos)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ entry }) => entry);
}

/** Levenshtein distance: the fewest insertions, deletions or substitutions from `a` to `b`. */
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length];
}

@Component({
  selector: 'poke-list',
  imports: [PokeSearchComponent, PokeCardComponent, InViewportDirective],
  templateUrl: './poke-list.component.html',
  styleUrls: ['./poke-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:scroll)': 'onScroll()',
  },
})
export class PokeListComponent {
  private readonly pokeApiService = inject(PokeApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly reload$ = new Subject<void>();

  protected readonly apiError = signal(false);
  /** Shown once the user has scrolled about a screen and a half down the list. */
  protected readonly showBackToTop = signal(false);
  /**
   * The search lives in `?q=` (the single source of truth), so it survives going to a
   * detail page and back, and follows router links and browser back/forward.
   */
  protected readonly query = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('q') ?? '')),
    { initialValue: this.route.snapshot.queryParamMap.get('q') ?? '' },
  );
  protected readonly pageSize = PAGE_SIZE;
  protected readonly priorityCards = PRIORITY_CARDS;
  /**
   * Rendered cards; back to the first page whenever the search changes. Starts from what
   * this history entry had loaded, so coming back from a detail page (or reloading) shows
   * the same cards and the router can restore the scroll position.
   */
  protected readonly limit = linkedSignal<string, number>({
    source: this.query,
    computation: (_, previous) => (previous ? PAGE_SIZE : this.restoredLimit()),
  });
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
  private readonly matches = computed(() => {
    const index = this.index();
    if (!index) {
      return undefined;
    }
    if (!this.query().trim()) {
      return { list: index, approximate: false };
    }
    const exact = index.filter(matcher(this.query()));
    return exact.length
      ? { list: exact, approximate: false }
      : { list: lookAlikes(index, this.query()), approximate: true };
  });

  protected readonly results = computed(() => this.matches()?.list);
  /** The results are look-alike names, since nothing matched the search exactly. */
  protected readonly approximate = computed(() => this.matches()?.approximate ?? false);

  protected readonly visible = computed(() => this.results()?.slice(0, this.limit()) ?? []);
  protected readonly hasMore = computed(() => (this.results()?.length ?? 0) > this.limit());

  onSearch(value: string): void {
    const q = value.trim();
    if (q === this.query()) {
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: q || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  loadMore(): void {
    if (this.hasMore()) {
      this.limit.update((limit) => limit + PAGE_SIZE);
      // Remembered on this history entry only (not the URL), keeping the router's own state.
      const state = this.location.getState() as ListHistoryState | null;
      this.location.replaceState(this.location.path(), '', { ...state, listLimit: this.limit() });
    }
  }

  private restoredLimit(): number {
    const limit = (this.location.getState() as ListHistoryState | null)?.listLimit;
    return Number.isInteger(limit) && limit! > PAGE_SIZE ? limit! : PAGE_SIZE;
  }

  protected onScroll(): void {
    this.showBackToTop.set(window.scrollY > window.innerHeight * 1.5);
  }

  protected backToTop(): void {
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  }

  retry(): void {
    this.apiError.set(false);
    this.reload$.next();
  }
}
