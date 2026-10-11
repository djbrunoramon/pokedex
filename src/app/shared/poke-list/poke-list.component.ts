import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { Location } from '@angular/common';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';

import { idFromUrl, PokeApiService } from '../../service/poke-api.service';
import { PokemonListItem, PokemonSummary } from '../../models/pokeapi.model';
import { PokeSearchComponent } from '../poke-search/poke-search.component';
import { PokeCardComponent } from '../poke-card/poke-card.component';
import { InViewportDirective } from '../directives/in-viewport.directive';
import { TYPE_NAMES, TypeNamePipe } from '../pipes/type-name.pipe';

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

/** A type the app knows (`fire`), or `''` for anything else (no filter). */
function knownType(type: string | null): string {
  return type && type in TYPE_NAMES ? type : '';
}

/** List orders (`?ordem=`), by label; `''` is the Pokédex order. */
export const SORTS: Readonly<Record<string, string>> = {
  '': 'Número',
  nome: 'Nome (A–Z)',
  total: 'Total de estatísticas',
  tipo: 'Tipo',
};

/** Orders that need every Pokémon's stat total and types (PokeApiService.summary). */
const SUMMARY_SORTS = new Set(['total', 'tipo']);

function knownSort(sort: string | null): string {
  return sort && sort in SORTS ? sort : '';
}

/**
 * The list in the chosen order: by name; by stat total, highest first; or by primary type
 * (its Portuguese name), then number. Species missing from the summary go last.
 */
function sortList(list: PokemonListItem[], sort: string, summary: Map<number, PokemonSummary> | undefined): PokemonListItem[] {
  const id = (entry: PokemonListItem) => idFromUrl(entry.url);
  const byNumber = (a: PokemonListItem, b: PokemonListItem) => id(a) - id(b);
  switch (sort) {
    case 'nome':
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    case 'total': {
      const total = (entry: PokemonListItem) => summary?.get(id(entry))?.total ?? -1;
      return [...list].sort((a, b) => total(b) - total(a) || byNumber(a, b));
    }
    case 'tipo': {
      const type = (entry: PokemonListItem) => {
        const name = summary?.get(id(entry))?.types[0];
        return name ? (TYPE_NAMES[name] ?? name) : '\uffff';
      };
      return [...list].sort((a, b) => type(a).localeCompare(type(b), 'pt-BR') || byNumber(a, b));
    }
    default:
      return list;
  }
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
  imports: [PokeSearchComponent, PokeCardComponent, InViewportDirective, TypeNamePipe],
  templateUrl: './poke-list.component.html',
  styleUrls: ['./poke-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:scroll)': 'onScroll()',
    '(window:resize)': 'updateFilterEdges()',
  },
})
export class PokeListComponent {
  private readonly pokeApiService = inject(PokeApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly reload$ = new Subject<void>();

  protected readonly apiError = signal(false);
  private readonly filters = viewChild.required<ElementRef<HTMLElement>>('filters');
  /**
   * Whether more type buttons are hidden to the left / right of the filter row (a single
   * scrolling row on phones); each side then fades out to show there is more.
   */
  protected readonly moreFiltersLeft = signal(false);
  protected readonly moreFiltersRight = signal(false);
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
  /** Type filter from `?tipo=` (an API type name such as `fire`); `''` for all types. */
  protected readonly type = toSignal(
    this.route.queryParamMap.pipe(map((params) => knownType(params.get('tipo')))),
    { initialValue: knownType(this.route.snapshot.queryParamMap.get('tipo')) },
  );
  /** List order from `?ordem=` (see SORTS); `''` for the Pokédex order. */
  protected readonly sort = toSignal(
    this.route.queryParamMap.pipe(map((params) => knownSort(params.get('ordem')))),
    { initialValue: knownSort(this.route.snapshot.queryParamMap.get('ordem')) },
  );
  protected readonly sorts = Object.entries(SORTS);
  protected readonly types = Object.keys(TYPE_NAMES);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly priorityCards = PRIORITY_CARDS;
  /**
   * Rendered cards; back to the first page whenever the search or the type changes. Starts
   * from what this history entry had loaded, so coming back from a detail page (or
   * reloading) shows the same cards and the router can restore the scroll position.
   */
  protected readonly limit = linkedSignal<string, number>({
    source: () => `${this.query()}|${this.type()}|${this.sort()}`,
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

  /** Ids of the filtered type; idle (no value) when showing every type. */
  private readonly typeMembers = rxResource({
    params: () => this.type() || undefined,
    stream: ({ params: type }) => this.pokeApiService.typeMembers(type).pipe(map((ids) => new Set(ids))),
  });

  /** Stat totals and types, loaded only for the orders that need them. */
  private readonly summary = rxResource({
    params: () => (SUMMARY_SORTS.has(this.sort()) ? this.sort() : undefined),
    stream: () => this.pokeApiService.summary(),
  });

  protected readonly typeError = computed(
    () => (!!this.type() && !!this.typeMembers.error()) || (SUMMARY_SORTS.has(this.sort()) && !!this.summary.error()),
  );

  constructor() {
    afterNextRender(() => this.updateFilterEdges());
  }

  /** Every Pokémon matching the search and type — the whole index, not just the rendered cards. */
  private readonly matches = computed(() => {
    let index = this.index();
    if (!index) {
      return undefined;
    }
    if (this.type()) {
      if (!this.typeMembers.hasValue()) {
        return undefined;
      }
      const members = this.typeMembers.value();
      index = index.filter((entry) => members.has(idFromUrl(entry.url)));
    }
    if (!this.query().trim()) {
      return { list: index, approximate: false };
    }
    const exact = index.filter(matcher(this.query()));
    return exact.length
      ? { list: exact, approximate: false }
      : { list: lookAlikes(index, this.query()), approximate: true };
  });

  /** Matches in the chosen order; look-alike names keep theirs (closest first). */
  protected readonly results = computed(() => {
    const matches = this.matches();
    if (!matches || matches.approximate || !this.sort()) {
      return matches?.list;
    }
    if (SUMMARY_SORTS.has(this.sort()) && !this.summary.hasValue()) {
      return undefined;
    }
    return sortList(matches.list, this.sort(), this.summary.value());
  });
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

  /** Filters by a type, or shows every type again with `''`; also kept in the URL. */
  setType(type: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tipo: type || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Changes the order (kept in the URL); `''` goes back to the Pokédex order. */
  setSort(sort: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ordem: knownSort(sort) || null },
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

  protected updateFilterEdges(): void {
    const { scrollLeft, scrollWidth, clientWidth } = this.filters().nativeElement;
    this.moreFiltersLeft.set(scrollLeft > 1);
    this.moreFiltersRight.set(scrollLeft + clientWidth < scrollWidth - 1);
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
    if (this.typeError()) {
      this.typeMembers.reload();
      this.summary.reload();
    }
  }
}
