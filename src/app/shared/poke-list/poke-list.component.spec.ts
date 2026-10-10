import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';

import { PokeListComponent } from './poke-list.component';
import { PokeApiService } from '../../service/poke-api.service';
import { Pokemon, PokemonListItem } from '../../models/pokeapi.model';

const NAMES = ['bulbasaur', 'ivysaur', 'venusaur', 'charmander'];

/** An index of `count` species; the first ones get real names, the rest `poke-<id>`. */
function index(count: number): PokemonListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    name: NAMES[i] ?? `poke-${i + 1}`,
    url: `https://pokeapi.co/api/v2/pokemon-species/${i + 1}/`,
  }));
}

class FakePokeApiService {
  response: () => Observable<PokemonListItem[]> = () => of(index(60));

  index(): Observable<PokemonListItem[]> {
    return this.response();
  }

  getPokemon(id: number): Observable<Pokemon> {
    return of({
      id,
      name: NAMES[id - 1] ?? `poke-${id}`,
      height: 1,
      weight: 1,
      stats: [],
      types: [{ type: { name: 'normal' } }],
      sprites: {
        front_default: null,
        other: { dream_world: { front_default: `${id}.svg` }, 'official-artwork': { front_default: null } },
      },
    });
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

  async function render() {
    const fixture = TestBed.createComponent(PokeListComponent);
    await fixture.whenStable();
    return fixture;
  }

  function cards(fixture: { nativeElement: HTMLElement }): NodeListOf<HTMLElement> {
    return fixture.nativeElement.querySelectorAll('a.card');
  }

  it('shows skeleton placeholders while the index loads', async () => {
    const pending = new Subject<PokemonListItem[]>();
    api.response = () => pending;

    const fixture = await render();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.grid--loading .skeleton').length).toBe(12);
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Carregando Pokémon');

    pending.next(index(3));
    await fixture.whenStable();

    expect(el.querySelector('.grid--loading')).toBeNull();
    expect(cards(fixture).length).toBe(3);
  });

  it('renders the first page and the total count', async () => {
    const fixture = await render();

    expect(cards(fixture).length).toBe(24);
    expect(cards(fixture)[0].textContent).toContain('#001');
    expect(fixture.nativeElement.querySelector('.count').textContent).toContain('60 Pokémon encontrados');
  });

  it('loads more pages until the index is exhausted', async () => {
    const fixture = await render();
    const more = () => fixture.nativeElement.querySelector('button.more') as HTMLButtonElement | null;

    more()!.click();
    await fixture.whenStable();
    expect(cards(fixture).length).toBe(48);

    more()!.click();
    await fixture.whenStable();
    expect(cards(fixture).length).toBe(60);
    expect(more()).toBeNull();
  });

  it('searches the whole index, including pokemon not rendered yet', async () => {
    const fixture = await render();

    fixture.componentInstance.onSearch('poke-5');
    await fixture.whenStable();

    // poke-5 and poke-50..59 — #50+ were never on screen before the search
    expect(cards(fixture).length).toBe(11);
    expect(fixture.nativeElement.textContent).toContain('poke-59');
  });

  it('matches by name substring and by Pokédex number', async () => {
    const fixture = await render();

    fixture.componentInstance.onSearch('SAUR ');
    await fixture.whenStable();
    expect(cards(fixture).length).toBe(3);

    fixture.componentInstance.onSearch('#4');
    await fixture.whenStable();
    expect(cards(fixture).length).toBe(1);
    expect(cards(fixture)[0].textContent).toContain('charmander');

    fixture.componentInstance.onSearch('57');
    await fixture.whenStable();
    expect(cards(fixture)[0].textContent).toContain('#057');
  });

  it('resets paging when the search changes', async () => {
    const fixture = await render();
    fixture.nativeElement.querySelector('button.more').click();
    await fixture.whenStable();
    expect(cards(fixture).length).toBe(48);

    fixture.componentInstance.onSearch('');
    await fixture.whenStable();
    expect(cards(fixture).length).toBe(24);
  });

  it('shows an empty state when the search has no match', async () => {
    const fixture = await render();

    fixture.componentInstance.onSearch('zzz');
    await fixture.whenStable();

    expect(cards(fixture).length).toBe(0);
    expect(fixture.nativeElement.querySelector('.state')?.textContent).toContain('Nenhum Pokémon encontrado para “zzz”');
  });

  it('shows an error state and reloads on retry', async () => {
    api.response = () => throwError(() => new Error('offline'));

    const fixture = await render();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar');

    api.response = () => of(index(2));
    el.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await fixture.whenStable();

    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(cards(fixture).length).toBe(2);
  });
});
