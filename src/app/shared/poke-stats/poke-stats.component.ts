import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PokemonStat } from '../../models/pokeapi.model';

/** Highest base stat any Pokémon has (Blissey's HP); scales the stat bars. */
export const MAX_BASE_STAT = 255;

/** Base stats in the games' order, with their Portuguese labels. */
export const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'Ataque Esp.',
  'special-defense': 'Defesa Esp.',
  speed: 'Velocidade',
};

/** Base stats with translated labels, bars proportional to the highest stat, and their total. */
@Component({
  selector: 'poke-stats',
  templateUrl: './poke-stats.component.html',
  styleUrls: ['./poke-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeStatsComponent {
  readonly stats = input.required<PokemonStat[]>();

  protected readonly rows = computed(() =>
    this.stats().map(({ stat, base_stat }) => ({
      name: stat.name,
      label: STAT_LABELS[stat.name] ?? stat.name,
      value: base_stat,
      percent: Math.min(100, (base_stat / MAX_BASE_STAT) * 100),
    })),
  );

  protected readonly total = computed(() => this.rows().reduce((sum, row) => sum + row.value, 0));
}
