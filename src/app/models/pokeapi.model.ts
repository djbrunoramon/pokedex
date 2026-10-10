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

/** A list entry enriched with its fetched detail (null while/if the detail call fails). */
export interface PokemonWithDetail extends PokemonListItem {
  detail: Pokemon | null;
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
  other: {
    dream_world: {
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
