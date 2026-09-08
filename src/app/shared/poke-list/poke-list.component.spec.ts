import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';

import { PokeListComponent } from './poke-list.component';
import { PokeApiService } from '../../service/poke-api.service';
import { PokemonWithDetail } from '../../models/pokeapi.model';

function detail(id: number, name: string, type: string): PokemonWithDetail {
  return {
    name,
    url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
    detail: {
      id,
      name,
      sprites: { other: { dream_world: { front_default: `${name}.svg` } } },
      stats: [],
      types: [{ type: { name: type } }],
    },
  };
}

class FakePokeApiService {
  listWithDetails(): Observable<PokemonWithDetail[]> {
    return of([detail(1, 'bulbasaur', 'grass'), detail(4, 'charmander', 'fire')]);
  }
}

describe('PokeListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokeListComponent],
      providers: [
        provideRouter([]),
        { provide: PokeApiService, useClass: FakePokeApiService },
      ],
    }).compileComponents();
  });

  it('renders a card per resolved pokemon', () => {
    const fixture = TestBed.createComponent(PokeListComponent);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('a.pokemon');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('bulbasaur');
    expect(cards[0].textContent).toContain('grass');
  });

  it('filters the list by name prefix via the search output', () => {
    const fixture = TestBed.createComponent(PokeListComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSearch('char');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('a.pokemon');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('charmander');
  });
});
