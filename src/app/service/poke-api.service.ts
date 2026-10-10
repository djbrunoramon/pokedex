import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, shareReplay, tap } from 'rxjs';

import {
  Pokemon,
  PokemonListItem,
  PokemonListResponse,
  PokemonSpecies,
} from '../models/pokeapi.model';

const API = 'https://pokeapi.co/api/v2';
/** Every species (no alternate forms) — a single, light request with names and urls only. */
const INDEX_URL = `${API}/pokemon-species/?offset=0&limit=10000`;

/** Extracts the numeric id from a PokéAPI resource url (`…/pokemon-species/25/` → 25). */
export function idFromUrl(url: string): number {
  return Number(url.split('/').filter(Boolean).pop());
}

/** Keeps only the fields of a `/pokemon/:id` response that the app reads. */
function slim({ id, name, height, weight, sprites, stats, types }: Pokemon): Pokemon {
  return {
    id,
    name,
    height,
    weight,
    sprites: {
      front_default: sprites.front_default,
      other: {
        dream_world: { front_default: sprites.other.dream_world.front_default },
        'official-artwork': { front_default: sprites.other['official-artwork'].front_default },
      },
    },
    stats: stats.map(({ base_stat, stat }) => ({ base_stat, stat: { name: stat.name } })),
    types: types.map(({ type }) => ({ type: { name: type.name } })),
  };
}

@Injectable({
  providedIn: 'root',
})
export class PokeApiService {
  private readonly http = inject(HttpClient);
  private readonly pokemonCache = new Map<string, Observable<Pokemon>>();
  private index$?: Observable<PokemonListItem[]>;

  /**
   * The full species index (name + url), fetched once and shared. A failed request is
   * not cached, so a later call retries.
   */
  index(): Observable<PokemonListItem[]> {
    this.index$ ??= this.http.get<PokemonListResponse>(INDEX_URL).pipe(
      map((res) => res.results),
      tap({ error: () => (this.index$ = undefined) }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.index$;
  }

  /**
   * A Pokémon's detail resource (by id or name), cached so scrolling and filtering never
   * refetch. Only the fields the app uses are kept — the raw payload is ~300 KB, mostly
   * moves. A request nobody is waiting for anymore is cancelled and not cached.
   */
  getPokemon(id: number | string): Observable<Pokemon> {
    const key = String(id);
    let pokemon$ = this.pokemonCache.get(key);
    if (!pokemon$) {
      pokemon$ = this.http.get<Pokemon>(`${API}/pokemon/${key}`).pipe(
        map(slim),
        tap({ error: () => this.pokemonCache.delete(key) }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
      this.pokemonCache.set(key, pokemon$);
    }
    return pokemon$;
  }

  getPokemonWithSpecies(id: string): Observable<[Pokemon, PokemonSpecies]> {
    return forkJoin([
      this.getPokemon(id),
      this.http.get<PokemonSpecies>(`${API}/pokemon-species/${id}`),
    ]);
  }
}
