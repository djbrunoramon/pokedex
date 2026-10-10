import { Pipe, PipeTransform } from '@angular/core';

import { Pokemon } from '../../models/pokeapi.model';

/**
 * Best available artwork for a Pokémon: the light dream-world SVG, falling back to the
 * official artwork and then the pixel sprite (newer Pokémon lack dream-world art).
 */
@Pipe({
  name: 'sprite',
})
export class SpritePipe implements PipeTransform {
  transform(pokemon: Pokemon): string | null {
    const { other, front_default } = pokemon.sprites;
    return other.dream_world.front_default ?? other['official-artwork'].front_default ?? front_default;
  }
}
