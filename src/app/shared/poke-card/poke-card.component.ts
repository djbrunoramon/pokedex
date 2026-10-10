import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { PokemonListItem } from '../../models/pokeapi.model';
import { idFromUrl, PokeApiService } from '../../service/poke-api.service';
import { DexNumberPipe } from '../pipes/dex-number.pipe';
import { SpritePipe } from '../pipes/sprite.pipe';

@Component({
  selector: 'poke-card',
  imports: [RouterLink, DexNumberPipe, SpritePipe],
  templateUrl: './poke-card.component.html',
  styleUrls: ['./poke-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeCardComponent {
  private readonly pokeApiService = inject(PokeApiService);

  /** Index entry; the card loads its own detail so off-screen Pokémon cost nothing. */
  readonly entry = input.required<PokemonListItem>();
  /** Above-the-fold cards load their image eagerly (it is the page's LCP element). */
  readonly priority = input(false);

  protected readonly id = computed(() => idFromUrl(this.entry().url));

  protected readonly detail = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.pokeApiService.getPokemon(id),
  });

  protected readonly primaryType = computed(() =>
    this.detail.hasValue() ? (this.detail.value().types[0]?.type.name ?? 'normal') : 'normal',
  );
}
