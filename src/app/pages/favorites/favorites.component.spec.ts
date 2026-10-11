import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { FavoritesComponent } from './favorites.component';
import { PokeApiService } from '../../service/poke-api.service';
import { FavoritesService } from '../../service/favorites.service';
import { Pokemon, PokemonListItem } from '../../models/pokeapi.model';

class FakePokeApiService {
  index: () => Observable<PokemonListItem[]> = () =>
    of(['bulbasaur', 'ivysaur', 'venusaur'].map((name, i) => ({ name, url: `/pokemon-species/${i + 1}/` })));

  getPokemon(): Observable<Pokemon> {
    return new Observable();
  }
}

describe('FavoritesComponent', () => {
  let api: FakePokeApiService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [FavoritesComponent],
      providers: [provideRouter([]), { provide: PokeApiService, useClass: FakePokeApiService }],
    }).compileComponents();
    api = TestBed.inject(PokeApiService) as unknown as FakePokeApiService;
  });

  function render() {
    const fixture = TestBed.createComponent(FavoritesComponent);
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick(); // reads the stored favourites
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the favourites as cards, in Pokédex order', () => {
    localStorage.setItem('pokedex:favoritos', JSON.stringify([3, 1]));
    const el = render();
    expect(el.querySelector('.count')?.textContent).toContain('2 Pokémon favoritos');
    expect(el.querySelectorAll('.grid poke-card')).toHaveLength(2);
    expect(TestBed.inject(FavoritesService).ids()).toEqual([3, 1]);
  });

  it('explains how to add favourites when there are none', () => {
    const el = render();
    expect(el.querySelector('.state')?.textContent).toContain('Você ainda não tem favoritos');
    expect(el.querySelector('.state a')?.getAttribute('href')).toBe('/');
  });

  it('shows an error when the Pokémon cannot be loaded', () => {
    api.index = () => throwError(() => new Error('offline'));
    expect(render().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar');
  });
});
