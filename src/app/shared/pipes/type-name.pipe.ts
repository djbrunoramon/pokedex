import { Pipe, PipeTransform } from '@angular/core';

/** Portuguese names of the Pokémon types (the PokéAPI has none in pt-BR). */
export const TYPE_NAMES: Readonly<Record<string, string>> = {
  normal: 'Normal',
  fire: 'Fogo',
  water: 'Água',
  electric: 'Elétrico',
  grass: 'Planta',
  ice: 'Gelo',
  fighting: 'Lutador',
  poison: 'Venenoso',
  ground: 'Terrestre',
  flying: 'Voador',
  psychic: 'Psíquico',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  dragon: 'Dragão',
  dark: 'Sombrio',
  steel: 'Aço',
  fairy: 'Fada',
};

/** Shows a type (`fire`) by its Portuguese name (`Fogo`); unknown types keep their API name. */
@Pipe({
  name: 'typeName',
})
export class TypeNamePipe implements PipeTransform {
  transform(type: string): string {
    return TYPE_NAMES[type] ?? type;
  }
}
