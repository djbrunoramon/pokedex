import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Pokemon, PokemonSpecies } from '../../models/pokeapi.model';

/** Pokédex texts come with the line breaks and form feeds of the game's text box. */
function cleanText(text: string | undefined): string | null {
  return text ? text.replace(/[\s­]+/g, ' ').trim() : null;
}

function english<T extends { language: { name: string } }>(entries: T[] = []): T[] {
  return entries.filter((entry) => entry.language.name === 'en');
}

/**
 * Category, Pokédex description and abilities — in English, as the PokéAPI has no
 * Portuguese texts. The description is the most recent game's.
 */
@Component({
  selector: 'poke-about',
  templateUrl: './poke-about.component.html',
  styleUrls: ['./poke-about.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeAboutComponent {
  readonly pokemon = input.required<Pokemon>();
  readonly species = input.required<PokemonSpecies>();

  protected readonly category = computed(() => english(this.species().genera).at(0)?.genus ?? null);

  protected readonly description = computed(() =>
    cleanText(english(this.species().flavor_text_entries).at(-1)?.flavor_text),
  );

  protected readonly abilities = computed(() =>
    (this.pokemon().abilities ?? []).map(({ ability, is_hidden }) => ({
      name: ability.name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      hidden: is_hidden,
    })),
  );
}
