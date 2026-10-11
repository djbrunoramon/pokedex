import { inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, of, shareReplay, tap } from 'rxjs';

import {
  EvolutionChain,
  Pokemon,
  PokemonListItem,
  PokemonListResponse,
  PokemonSpecies,
  PokemonSummary,
  PokemonSummaryFile,
  PokemonTypeResponse,
} from '../models/pokeapi.model';

const API = 'https://pokeapi.co/api/v2';
/** Every species (no alternate forms) — a single, light request with names and urls only. */
const INDEX_URL = `${API}/pokemon-species/?offset=0&limit=10000`;

/** Extracts the numeric id from a PokéAPI resource url (`…/pokemon-species/25/` → 25). */
export function idFromUrl(url: string): number {
  return Number(url.split('/').filter(Boolean).pop());
}

/** Official artwork of a species by Pokédex number (every species has one). */
export function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

/** Keeps only the fields of a `/pokemon/:id` response that the app reads. */
function slim({ id, name, height, weight, sprites, stats, types, abilities }: Pokemon): Pokemon {
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
    abilities: abilities.map(({ ability, is_hidden }) => ({ ability: { name: ability.name }, is_hidden })),
  };
}

/**
 * Keeps only what the app reads of a `/pokemon-species/:id` response, which carries every
 * language's texts: the name, the first localized name (the Japanese watermark), and the
 * English category and latest English description.
 */
function slimSpecies({ name, names, genera, flavor_text_entries, evolution_chain }: PokemonSpecies): PokemonSpecies {
  const english = <T extends { language: { name: string } }>(entries: T[]) =>
    entries.filter((entry) => entry.language.name === 'en');
  return {
    name,
    names: names.slice(0, 1),
    genera: english(genera).slice(0, 1),
    flavor_text_entries: english(flavor_text_entries).slice(-1),
    evolution_chain,
  };
}

@Injectable({
  providedIn: 'root',
})
export class PokeApiService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));
  private readonly pokemonCache = new Map<string, Observable<Pokemon>>();
  private readonly typeCache = new Map<string, Observable<number[]>>();
  private readonly evolutionCache = new Map<string, Observable<EvolutionChain>>();
  private index$?: Observable<PokemonListItem[]>;
  private summary$?: Observable<Map<number, PokemonSummary>>;

  /**
   * The full species index (name + url), fetched once and shared. A failed request is
   * not cached, so a later call retries.
   */
  index(): Observable<PokemonListItem[]> {
    this.index$ ??= this.transferred(
      'index',
      this.http.get<PokemonListResponse>(INDEX_URL).pipe(map((res) => res.results)),
    ).pipe(
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
      pokemon$ = this.transferred(
        `pokemon-${key}`,
        this.http.get<Pokemon>(`${API}/pokemon/${key}`).pipe(map(slim)),
      ).pipe(
        tap({ error: () => this.pokemonCache.delete(key) }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
      this.pokemonCache.set(key, pokemon$);
    }
    return pokemon$;
  }

  /**
   * Ids of the Pokémon of a type (`fire`), fetched once per type. Alternate forms
   * (ids beyond the species range) come along too; they never match an index entry.
   */
  typeMembers(type: string): Observable<number[]> {
    let ids$ = this.typeCache.get(type);
    if (!ids$) {
      ids$ = this.http.get<PokemonTypeResponse>(`${API}/type/${type}`).pipe(
        map((res) => res.pokemon.map(({ pokemon }) => idFromUrl(pokemon.url))),
        tap({ error: () => this.typeCache.delete(type) }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.typeCache.set(type, ids$);
    }
    return ids$;
  }

  /**
   * Stat total and types of every species, from a file shipped with the app (the PokéAPI
   * would need one request per Pokémon); fetched once, on first use.
   */
  summary(): Observable<Map<number, PokemonSummary>> {
    this.summary$ ??= this.http.get<PokemonSummaryFile>('assets/data/pokemon-summary.json').pipe(
      map(
        (file) =>
          new Map(Object.entries(file).map(([id, [total, ...types]]): [number, PokemonSummary] => [Number(id), { total, types }])),
      ),
      tap({ error: () => (this.summary$ = undefined) }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.summary$;
  }

  /** An evolution chain (by the url a species points to), fetched once and shared. */
  getEvolutionChain(url: string): Observable<EvolutionChain> {
    let chain$ = this.evolutionCache.get(url);
    if (!chain$) {
      chain$ = this.transferred(`evolution-${url}`, this.http.get<EvolutionChain>(url)).pipe(
        tap({ error: () => this.evolutionCache.delete(url) }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.evolutionCache.set(url, chain$);
    }
    return chain$;
  }

  getPokemonWithSpecies(id: string): Observable<[Pokemon, PokemonSpecies]> {
    return forkJoin([
      this.getPokemon(id),
      this.transferred(
        `species-${id}`,
        this.http.get<PokemonSpecies>(`${API}/pokemon-species/${id}`).pipe(map(slimSpecies)),
      ),
    ]);
  }

  /**
   * Hands a response from the prerendered page to the browser: the server stores it in the
   * page, and the browser's first request for it reads it from there instead of the network
   * — so hydration finds the same data and nothing flickers. Used only for trimmed
   * responses, as each one is embedded in the HTML.
   */
  private transferred<T>(key: string, request: Observable<T>): Observable<T> {
    const stateKey = makeStateKey<T>(key);
    if (this.isServer) {
      return request.pipe(tap((value) => this.transferState.set(stateKey, value)));
    }
    if (this.transferState.hasKey(stateKey)) {
      const value = this.transferState.get(stateKey, null) as T;
      this.transferState.remove(stateKey);
      return of(value);
    }
    return request;
  }
}
