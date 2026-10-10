import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';

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
      height: 7,
      weight: 69,
      sprites: { other: { dream_world: { front_default: `${name}.svg` } } },
      stats: [],
      types: [{ type: { name: type } }],
    },
  };
}

class FakePokeApiService {
  response: () => Observable<PokemonWithDetail[]> = () =>
    of([detail(1, 'bulbasaur', 'grass'), detail(4, 'charmander', 'fire')]);

  listWithDetails(): Observable<PokemonWithDetail[]> {
    return this.response();
  }
}

describe('PokeListComponent', () => {
  let api: FakePokeApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokeListComponent],
      providers: [
        provideRouter([]),
        { provide: PokeApiService, useClass: FakePokeApiService },
      ],
    }).compileComponents();

    api = TestBed.inject(PokeApiService) as unknown as FakePokeApiService;
  });

  it('shows skeleton placeholders while loading', () => {
    const pending = new Subject<PokemonWithDetail[]>();
    api.response = () => pending;

    const fixture = TestBed.createComponent(PokeListComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.skeleton').length).toBe(12);
    expect(el.querySelector('a.card')).toBeNull();

    pending.next([detail(1, 'bulbasaur', 'grass')]);
    fixture.detectChanges();

    expect(el.querySelectorAll('.skeleton').length).toBe(0);
    expect(el.querySelectorAll('a.card').length).toBe(1);
  });

  it('renders a card per resolved pokemon with number and type', () => {
    const fixture = TestBed.createComponent(PokeListComponent);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('a.card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('bulbasaur');
    expect(cards[0].textContent).toContain('#001');
    expect(cards[0].textContent).toContain('grass');
    expect(cards[0].getAttribute('data-type')).toBe('grass');
    expect(cards[0].getAttribute('href')).toBe('/details/1');
  });

  it('filters the list by name prefix via the search output', () => {
    const fixture = TestBed.createComponent(PokeListComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSearch('Char ');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('a.card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('charmander');
    expect(fixture.nativeElement.querySelector('.count').textContent).toContain('1 Pokémon encontrado');
  });

  it('shows an empty state when the search has no match', () => {
    const fixture = TestBed.createComponent(PokeListComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSearch('zzz');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('a.card').length).toBe(0);
    expect(el.querySelector('.state')?.textContent).toContain('Nenhum Pokémon encontrado para “zzz”');
  });

  it('shows an error state and reloads on retry', () => {
    api.response = () => throwError(() => new Error('offline'));

    const fixture = TestBed.createComponent(PokeListComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar');

    api.response = () => of([detail(25, 'pikachu', 'electric')]);
    el.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.querySelectorAll('a.card').length).toBe(1);
    expect(el.textContent).toContain('#025');
  });
});
