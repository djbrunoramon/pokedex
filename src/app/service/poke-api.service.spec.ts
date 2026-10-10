import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { idFromUrl, PokeApiService } from './poke-api.service';
import { PokemonListItem } from '../models/pokeapi.model';

const API = 'https://pokeapi.co/api/v2';

/** A trimmed-down `/pokemon/25` payload, including fields the app should drop. */
const RAW_PIKACHU = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  base_experience: 112,
  moves: [{ move: { name: 'thunder-shock' } }],
  sprites: {
    front_default: 'p.png',
    back_default: 'b.png',
    other: {
      dream_world: { front_default: 'p.svg', front_female: null },
      'official-artwork': { front_default: null, front_shiny: 's.png' },
      showdown: {},
    },
  },
  stats: [{ base_stat: 35, effort: 0, stat: { name: 'hp', url: 'x' } }],
  types: [{ slot: 1, type: { name: 'electric', url: 'y' } }],
};

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

  it('caches pokemon details by id, keeping only the fields the app uses', () => {
    let pokemon: unknown;
    service.getPokemon(25).subscribe((value) => (pokemon = value));
    service.getPokemon(25).subscribe();
    http.expectOne(`${API}/pokemon/25`).flush(RAW_PIKACHU);

    expect(pokemon).toEqual({
      id: 25,
      name: 'pikachu',
      height: 4,
      weight: 60,
      sprites: {
        front_default: 'p.png',
        other: { dream_world: { front_default: 'p.svg' }, 'official-artwork': { front_default: null } },
      },
      stats: [{ base_stat: 35, stat: { name: 'hp' } }],
      types: [{ type: { name: 'electric' } }],
    });

    service.getPokemon(25).subscribe();
    http.expectNone(`${API}/pokemon/25`);
  });

  it('does not cache failed detail requests', () => {
    service.getPokemon(7).subscribe({ error: () => undefined });
    http.expectOne(`${API}/pokemon/7`).flush('nope', { status: 500, statusText: 'Error' });

    service.getPokemon(7).subscribe();
    http.expectOne(`${API}/pokemon/7`).flush(RAW_PIKACHU);
  });

  it('cancels a detail request nobody waits for anymore and refetches later', () => {
    service.getPokemon(9).subscribe().unsubscribe();
    expect(http.expectOne(`${API}/pokemon/9`).cancelled).toBe(true);

    service.getPokemon(9).subscribe();
    http.expectOne(`${API}/pokemon/9`).flush(RAW_PIKACHU);
  });

  it('accepts names as well as ids (deep links like /details/pikachu)', () => {
    service.getPokemon('pikachu').subscribe();
    http.expectOne(`${API}/pokemon/pikachu`).flush(RAW_PIKACHU);
  });
});
