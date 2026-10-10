import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { EvolutionLink } from '../../models/pokeapi.model';
import { artworkUrl, idFromUrl, PokeApiService } from '../../service/poke-api.service';
import { DexNumberPipe } from '../pipes/dex-number.pipe';

interface EvolutionMember {
  id: number;
  name: string;
  image: string;
}

/** The chain as stages: `[[bulbasaur], [ivysaur], [venusaur]]`; branches share a stage (Eevee). */
function stages(link: EvolutionLink): EvolutionMember[][] {
  const result: EvolutionMember[][] = [];
  let current = [link];
  while (current.length) {
    result.push(
      current.map(({ species }) => {
        const id = idFromUrl(species.url);
        return { id, name: species.name, image: artworkUrl(id) };
      }),
    );
    current = current.flatMap((member) => member.evolves_to);
  }
  return result;
}

@Component({
  selector: 'poke-evolution',
  imports: [RouterLink, DexNumberPipe],
  templateUrl: './poke-evolution.component.html',
  styleUrls: ['./poke-evolution.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeEvolutionComponent {
  private readonly pokeApiService = inject(PokeApiService);

  /** The species' `evolution_chain.url`; `null` when the species has none. */
  readonly chainUrl = input.required<string | null>();
  /** Pokédex number of the Pokémon on screen, highlighted in the chain. */
  readonly currentId = input.required<number>();
  /** History state for the links (see DetailsComponent.neighbourState). */
  readonly linkState = input<Record<string, unknown>>({});

  protected readonly chain = rxResource({
    params: () => this.chainUrl() ?? undefined,
    stream: ({ params: url }) => this.pokeApiService.getEvolutionChain(url),
  });

  protected readonly stages = computed(() => (this.chain.hasValue() ? stages(this.chain.value().chain) : []));
}
