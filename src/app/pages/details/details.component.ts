import { isPlatformServer, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap, tap } from 'rxjs';

import { artworkUrl, PokeApiService } from '../../service/poke-api.service';
import { SeoService } from '../../service/seo.service';
import { Pokemon, PokemonListItem, PokemonSpecies } from '../../models/pokeapi.model';
import { DexNumberPipe } from '../../shared/pipes/dex-number.pipe';
import { SpritePipe } from '../../shared/pipes/sprite.pipe';
import { TYPE_NAMES, TypeNamePipe } from '../../shared/pipes/type-name.pipe';
import { PokeAboutComponent } from '../../shared/poke-about/poke-about.component';
import { PokeEvolutionComponent } from '../../shared/poke-evolution/poke-evolution.component';
import { PokeStatsComponent } from '../../shared/poke-stats/poke-stats.component';
import { PokeFavoriteComponent } from '../../shared/poke-favorite/poke-favorite.component';
import { PokeShareComponent } from '../../shared/poke-share/poke-share.component';

interface DetailsViewModel {
  pokemon: Pokemon | null;
  species: PokemonSpecies | null;
  error: boolean;
}

const EMPTY_VM: DetailsViewModel = { pokemon: null, species: null, error: false };

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

@Component({
  selector: 'app-details',
  imports: [RouterLink, DexNumberPipe, SpritePipe, TypeNamePipe, PokeAboutComponent, PokeEvolutionComponent, PokeStatsComponent, PokeFavoriteComponent, PokeShareComponent],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onArrowKey($event)',
  },
})
export class DetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly pokeApiService = inject(PokeApiService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  /** Follows the `:id` param: going to the previous/next Pokémon reuses this component. */
  protected readonly vm = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) =>
        this.pokeApiService.getPokemonWithSpecies(params.get('id') ?? '').pipe(
          tap(([pokemon, species]) => this.describePage(pokemon, species)),
          map(([pokemon, species]): DetailsViewModel => ({ pokemon, species, error: false })),
          catchError(() => {
            this.seo.setPage({ title: 'Pokémon não encontrado | Pokédex', path: `/details/${params.get('id')}`, noindex: true });
            return of<DetailsViewModel>({ ...EMPTY_VM, error: true });
          }),
          startWith(EMPTY_VM),
        ),
      ),
    ),
    { initialValue: EMPTY_VM },
  );

  /**
   * Number of species (the last Pokédex number); 0 until known. Not fetched while
   * prerendering, so the page doesn't embed the whole index: the neighbour links appear
   * once the browser has it.
   */
  private readonly speciesCount = toSignal(
    (isPlatformServer(inject(PLATFORM_ID)) ? of<PokemonListItem[]>([]) : this.pokeApiService.index()).pipe(
      map((index) => index.length),
      catchError(() => of(0)),
    ),
    { initialValue: 0 },
  );

  /** Pokédex number in the URL — known before the Pokémon loads, so ←/→ work meanwhile. */
  private readonly routeId = toSignal(this.route.paramMap.pipe(map((params) => Number(params.get('id')))), {
    initialValue: NaN,
  });

  /** Neighbouring Pokédex numbers, `null` at either end of the Pokédex. */
  protected readonly previousId = computed(() => {
    const id = this.vm().pokemon?.id ?? this.routeId();
    return Number.isInteger(id) && id > 1 && id <= this.speciesCount() ? id - 1 : null;
  });

  protected readonly nextId = computed(() => {
    const id = this.vm().pokemon?.id ?? this.routeId();
    return Number.isInteger(id) && id >= 1 && id < this.speciesCount() ? id + 1 : null;
  });

  /**
   * History state for the previous/next links: they replace this entry (so "Voltar" and
   * the browser's back still lead to the list) and keep whether it was opened from it.
   */
  protected readonly neighbourState = { fromList: this.openedFromList() };

  /**
   * The species name: `/pokemon/:id` is the default form, which some species name after
   * it (`darmanitan-standard`, `giratina-altered`).
   */
  protected readonly name = computed(() => this.vm().species?.name ?? this.vm().pokemon?.name ?? '');

  /** Text shared along with the page's link. */
  protected readonly shareText = computed(() => {
    const pokemon = this.vm().pokemon;
    return pokemon ? summary(capitalize(this.name()), pokemon) : '';
  });

  protected readonly primaryType = computed(
    () => this.vm().pokemon?.types[0]?.type.name ?? 'normal',
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
    if (this.openedFromList()) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }

  /** ← and → go to the previous and next Pokémon, unless the user is typing somewhere. */
  protected onArrowKey(event: KeyboardEvent): void {
    const target = event.target;
    const typing = target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]');
    if (typing || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const id =
      event.key === 'ArrowLeft' ? this.previousId() : event.key === 'ArrowRight' ? this.nextId() : null;
    if (id) {
      event.preventDefault();
      this.router.navigate(['/details', id], { replaceUrl: true, state: this.neighbourState });
    }
  }

  /** Title and link preview of this Pokémon's page: `Pikachu (#025): Pokémon do tipo Elétrico…`. */
  private describePage(pokemon: Pokemon, species: PokemonSpecies): void {
    const name = capitalize(species.name);
    this.seo.setPage({
      title: `${name} | Pokédex`,
      description: `${summary(name, pokemon)} Veja estatísticas base, habilidades e evoluções na Pokédex.`,
      path: `/details/${pokemon.id}`,
      image: artworkUrl(pokemon.id),
    });
  }

  private openedFromList(): boolean {
    return !!(this.location.getState() as { fromList?: boolean } | null)?.fromList;
  }
}

/** `Pikachu (#025): Pokémon do tipo Elétrico.` */
function summary(name: string, pokemon: Pokemon): string {
  const types = pokemon.types.map(({ type }) => TYPE_NAMES[type.name] ?? type.name).join(' e ');
  return `${name} (${new DexNumberPipe().transform(pokemon.id)}): Pokémon do tipo ${types}.`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
