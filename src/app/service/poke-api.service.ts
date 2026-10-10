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

@Injectable({
  providedIn: 'root',
})
export class PokeApiService {
  private readonly http = inject(HttpClient);
  private readonly pokemonCache = new Map<number, Observable<Pokemon>>();
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

  /** A Pokémon's detail resource, cached by id so scrolling and filtering never refetch. */
  getPokemon(id: number): Observable<Pokemon> {
    let pokemon$ = this.pokemonCache.get(id);
    if (!pokemon$) {
      pokemon$ = this.http.get<Pokemon>(`${API}/pokemon/${id}`).pipe(
        tap({ error: () => this.pokemonCache.delete(id) }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.pokemonCache.set(id, pokemon$);
    }
    return pokemon$;
  }

  getPokemonWithSpecies(id: string): Observable<[Pokemon, PokemonSpecies]> {
    return forkJoin([
      this.getPokemon(Number(id)),
      this.http.get<PokemonSpecies>(`${API}/pokemon-species/${id}`),
    ]);
  }
}
