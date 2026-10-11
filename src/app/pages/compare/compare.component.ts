import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';

import { PokemonListItem } from '../../models/pokeapi.model';
import { artworkUrl, idFromUrl, PokeApiService } from '../../service/poke-api.service';
import { SeoService } from '../../service/seo.service';
import { DexNumberPipe } from '../../shared/pipes/dex-number.pipe';
import { TypeNamePipe } from '../../shared/pipes/type-name.pipe';
import { PokeRadarComponent } from '../../shared/poke-radar/poke-radar.component';
import { STAT_LABELS } from '../../shared/poke-stats/poke-stats.component';

/** Most Pokémon compared at once. */
export const MAX_COMPARED = 3;

/** One colour per compared Pokémon, in the chart, the legend and the columns. */
const COLORS = ['#ff5473', '#3ba7f0', '#f2a900'];

/** `?ids=1,4,7` → [1, 4, 7]: distinct positive numbers, at most three. */
function parseIds(value: string | null): number[] {
  const ids = (value ?? '').split(',').map(Number).filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)].slice(0, MAX_COMPARED);
}

/** Up to three Pokémon side by side: base stats overlaid on a radar chart and in a table. */
@Component({
  selector: 'app-compare',
  imports: [RouterLink, DexNumberPipe, TypeNamePipe, PokeRadarComponent],
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareComponent {
  private readonly api = inject(PokeApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly max = MAX_COMPARED;

  /** The compared Pokémon live in the URL, so a comparison can be shared. */
  protected readonly ids = toSignal(this.route.queryParamMap.pipe(map((params) => parseIds(params.get('ids')))), {
    initialValue: parseIds(this.route.snapshot.queryParamMap.get('ids')),
  });

  /** Species index: names for the picker and the columns; `null` if it failed. */
  protected readonly index = toSignal(this.api.index().pipe(catchError(() => of(null))));

  private readonly pokemon = rxResource({
    params: () => this.ids(),
    stream: ({ params: ids }) => (ids.length ? forkJoin(ids.map((id) => this.api.getPokemon(id))) : of([])),
  });

  protected readonly error = computed(() => !!this.pokemon.error());

  /** Feedback for the add form (not found, already there), announced politely. */
  protected readonly message = signal('');

  protected readonly columns = computed(() => {
    if (!this.pokemon.hasValue()) {
      return undefined;
    }
    const names = new Map((this.index() ?? []).map((entry): [number, string] => [idFromUrl(entry.url), entry.name]));
    return this.pokemon.value().map((pokemon, i) => {
      const values = Object.keys(STAT_LABELS).map(
        (stat) => pokemon.stats.find((entry) => entry.stat.name === stat)?.base_stat ?? 0,
      );
      return {
        id: pokemon.id,
        name: names.get(pokemon.id) ?? pokemon.name,
        color: COLORS[i],
        image: artworkUrl(pokemon.id),
        types: pokemon.types.map(({ type }) => type.name),
        values,
      };
    });
  });

  /** Table rows: each stat and the total, with the highest value to highlight. */
  protected readonly rows = computed(() => {
    const columns = this.columns() ?? [];
    const rows = Object.values(STAT_LABELS).map((label, i) => ({ label, values: columns.map((column) => column.values[i]) }));
    rows.push({ label: 'Total', values: columns.map((column) => column.values.reduce((sum, value) => sum + value, 0)) });
    return rows.map((row) => ({ ...row, best: Math.max(...row.values) }));
  });

  constructor() {
    inject(SeoService).setPage({ title: 'Comparar Pokémon | Pokédex', path: '/comparar' });
  }

  /** Adds the Pokémon typed in the field, by name or number. */
  protected add(event: Event, field: HTMLInputElement): void {
    event.preventDefault();
    const query = field.value.trim().toLowerCase().replace(/^#/, '');
    if (!query) {
      return;
    }
    const entry = this.find(query);
    if (!entry) {
      this.message.set(`Nenhum Pokémon encontrado para “${field.value.trim()}”.`);
      return;
    }
    const id = idFromUrl(entry.url);
    if (this.ids().includes(id)) {
      this.message.set(`${entry.name} já está na comparação.`);
      return;
    }
    field.value = '';
    this.message.set(`${entry.name} adicionado à comparação.`);
    this.setIds([...this.ids(), id]);
  }

  protected remove(id: number, name: string): void {
    this.message.set(`${name} removido da comparação.`);
    this.setIds(this.ids().filter((other) => other !== id));
  }

  private find(query: string): PokemonListItem | undefined {
    const index = this.index() ?? [];
    return /^\d+$/.test(query)
      ? index.find((entry) => idFromUrl(entry.url) === Number(query))
      : index.find((entry) => entry.name === query);
  }

  private setIds(ids: number[]): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ids: ids.length ? ids.join(',') : null },
      replaceUrl: true,
    });
  }
}
