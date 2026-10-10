/** Typed subset of the https://pokeapi.co/api/v2 responses this app consumes. */

export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokemonListItem[];
}

export interface PokemonListItem {
  name: string;
  url: string;
}

export interface Pokemon {
  id: number;
  name: string;
  /** Height in decimetres. */
  height: number;
  /** Weight in hectograms. */
  weight: number;
  sprites: PokemonSprites;
  stats: PokemonStat[];
  types: PokemonTypeSlot[];
}

export interface PokemonSprites {
  front_default: string | null;
  other: {
    dream_world: {
      front_default: string | null;
    };
    'official-artwork': {
      front_default: string | null;
    };
  };
}

export interface PokemonStat {
  base_stat: number;
  stat: { name: string };
}

export interface PokemonTypeSlot {
  type: { name: string };
}

export interface PokemonSpecies {
  names: Array<{
    name: string;
    language: { name: string };
  }>;
}
