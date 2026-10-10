import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { idFromUrl, PokeApiService } from './poke-api.service';
import { PokemonListItem } from '../models/pokeapi.model';

const API = 'https://pokeapi.co/api/v2';

describe('PokeApiService', () => {
  let service: PokeApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PokeApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('extracts ids from resource urls', () => {
    expect(idFromUrl(`${API}/pokemon-species/25/`)).toBe(25);
    expect(idFromUrl(`${API}/pokemon-species/1025`)).toBe(1025);
  });

  it('fetches the full species index once and shares it', () => {
    const results: PokemonListItem[] = [{ name: 'bulbasaur', url: `${API}/pokemon-species/1/` }];
    let first: PokemonListItem[] | undefined;
    let second: PokemonListItem[] | undefined;

    service.index().subscribe((value) => (first = value));
    service.index().subscribe((value) => (second = value));

    const req = http.expectOne(`${API}/pokemon-species/?offset=0&limit=10000`);
    req.flush({ count: 1, next: null, previous: null, results });

    expect(first).toEqual(results);
    expect(second).toEqual(results);
  });

  it('retries the index after a failed request', () => {
    service.index().subscribe({ error: () => undefined });
    http.expectOne(`${API}/pokemon-species/?offset=0&limit=10000`).flush('down', { status: 500, statusText: 'Error' });

    service.index().subscribe();
    http.expectOne(`${API}/pokemon-species/?offset=0&limit=10000`).flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('caches pokemon details by id', () => {
    service.getPokemon(25).subscribe();
    service.getPokemon(25).subscribe();
    http.expectOne(`${API}/pokemon/25`).flush({ id: 25 });

    service.getPokemon(25).subscribe();
    http.expectNone(`${API}/pokemon/25`);
  });

  it('does not cache failed detail requests', () => {
    service.getPokemon(7).subscribe({ error: () => undefined });
    http.expectOne(`${API}/pokemon/7`).flush('nope', { status: 500, statusText: 'Error' });

    service.getPokemon(7).subscribe();
    http.expectOne(`${API}/pokemon/7`).flush({ id: 7 });
  });
});
