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
  abilities: PokemonAbilitySlot[];
}

export interface PokemonAbilitySlot {
  ability: { name: string };
  /** A hidden ability, only found on some individuals. */
  is_hidden: boolean;
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

/** `/type/:name` — only the Pokémon of that type are read. */
export interface PokemonTypeResponse {
  pokemon: Array<{ pokemon: { name: string; url: string } }>;
}

export interface PokemonSpecies {
  names: Array<{
    name: string;
    language: { name: string };
  }>;
  /** Category, e.g. "Mouse Pokémon". */
  genera: Array<{
    genus: string;
    language: { name: string };
  }>;
  /** Pokédex descriptions, one per game and language. */
  flavor_text_entries: Array<{
    flavor_text: string;
    language: { name: string };
  }>;
  evolution_chain: { url: string } | null;
}

/** `/evolution-chain/:id` — a tree of species, from the base form. */
export interface EvolutionChain {
  chain: EvolutionLink;
}

export interface EvolutionLink {
  species: { name: string; url: string };
  evolves_to: EvolutionLink[];
}
