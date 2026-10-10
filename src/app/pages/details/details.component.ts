import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';

import { PokeApiService } from '../../service/poke-api.service';
import { Pokemon, PokemonSpecies } from '../../models/pokeapi.model';
import { DexNumberPipe } from '../../shared/pipes/dex-number.pipe';
import { SpritePipe } from '../../shared/pipes/sprite.pipe';

interface DetailsViewModel {
  pokemon: Pokemon | null;
  species: PokemonSpecies | null;
  error: boolean;
}

const EMPTY_VM: DetailsViewModel = { pokemon: null, species: null, error: false };

/** Highest base stat any Pokémon has (Blissey's HP); scales the stat bars. */
const MAX_BASE_STAT = 255;

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'Ataque Esp.',
  'special-defense': 'Defesa Esp.',
  speed: 'Velocidade',
};

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

@Component({
  selector: 'app-details',
  imports: [DexNumberPipe, SpritePipe],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly pokeApiService = inject(PokeApiService);
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  private readonly location = inject(Location);


  protected readonly vm = toSignal(
    this.pokeApiService
      .getPokemonWithSpecies(String(this.route.snapshot.params['id']))
      .pipe(
        tap(([pokemon]) => this.title.setTitle(`${capitalize(pokemon.name)} | Pokédex`)),
        map(([pokemon, species]): DetailsViewModel => ({ pokemon, species, error: false })),
        catchError(() => of<DetailsViewModel>({ ...EMPTY_VM, error: true })),
      ),
    { initialValue: EMPTY_VM },
  );

  protected readonly primaryType = computed(
    () => this.vm().pokemon?.types[0]?.type.name ?? 'normal',
  );

  protected readonly stats = computed(() =>
    (this.vm().pokemon?.stats ?? []).map(({ stat, base_stat }) => ({
      name: stat.name,
      label: STAT_LABELS[stat.name] ?? stat.name,
      value: base_stat,
      percent: Math.min(100, (base_stat / MAX_BASE_STAT) * 100),
    })),
  );

  protected readonly total = computed(() =>
    this.stats().reduce((sum, stat) => sum + stat.value, 0),
  );

  protected readonly measures = computed(() => {
    const pokemon = this.vm().pokemon;
    return pokemon
      ? {
          height: `${decimal.format(pokemon.height / 10)} m`,
          weight: `${decimal.format(pokemon.weight / 10)} kg`,
        }
      : null;
  });

  /**
   * Goes back through history when we came from the list, so its `?q=` search and scroll
   * position are restored; otherwise (deep link) opens the list.
   */
  back(): void {
    // Set by the list's cards on this history entry; survives reloads and back/forward,
    // unlike "the app navigated before", which can't tell what the previous entry is.
    const state = this.location.getState() as { fromList?: boolean } | null;
    if (state?.fromList) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
