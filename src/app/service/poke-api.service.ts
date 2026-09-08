import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';

import {
  Pokemon,
  PokemonListResponse,
  PokemonSpecies,
  PokemonWithDetail,
} from '../models/pokeapi.model';

const API = 'https://pokeapi.co/api/v2';
const LIST_URL = `${API}/pokemon/?offset=0&limit=100`;

@Injectable({
  providedIn: 'root',
})
export class PokeApiService {
  private readonly http = inject(HttpClient);

  /**
   * Fetches the first 100 Pokémon and, for each, its detail resource, resolving
   * once every detail call has completed. A failed detail call yields `detail: null`
   * rather than rejecting the whole list.
   */
  listWithDetails(): Observable<PokemonWithDetail[]> {
    return this.http.get<PokemonListResponse>(LIST_URL).pipe(
      switchMap((res) =>
        res.results.length
          ? forkJoin(
              res.results.map((item) =>
                this.http.get<Pokemon>(item.url).pipe(
                  map((detail): PokemonWithDetail => ({ ...item, detail })),
                  catchError(() => of<PokemonWithDetail>({ ...item, detail: null })),
                ),
              ),
            )
          : of<PokemonWithDetail[]>([]),
      ),
    );
  }

  getPokemonWithSpecies(id: string): Observable<[Pokemon, PokemonSpecies]> {
    return forkJoin([
      this.http.get<Pokemon>(`${API}/pokemon/${id}`),
      this.http.get<PokemonSpecies>(`${API}/pokemon-species/${id}`),
    ]);
  }
}
