import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import { CompareComponent } from './compare.component';
import { PokeApiService } from '../../service/poke-api.service';
import { Pokemon, PokemonListItem } from '../../models/pokeapi.model';

const STATS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

function pokemon(id: number, name: string, values: number[], type = 'normal'): Pokemon {
  return {
    id,
    name,
    height: 1,
    weight: 1,
    sprites: { front_default: null, other: { dream_world: { front_default: null }, 'official-artwork': { front_default: null } } },
    stats: STATS.map((stat, i) => ({ base_stat: values[i], stat: { name: stat } })),
    types: [{ type: { name: type } }],
    abilities: [],
    cries: { latest: null, legacy: null },
  };
}

const POKEMON: Record<number, Pokemon> = {
  1: pokemon(1, 'bulbasaur', [45, 49, 49, 65, 65, 45], 'grass'),
  4: pokemon(4, 'charmander', [39, 52, 43, 60, 50, 65], 'fire'),
  555: pokemon(555, 'darmanitan-standard', [105, 140, 55, 30, 55, 95], 'fire'),
};

class FakePokeApiService {
  failing = false;
  index(): Observable<PokemonListItem[]> {
    return of([
      { name: 'bulbasaur', url: '/pokemon-species/1/' },
      { name: 'charmander', url: '/pokemon-species/4/' },
      { name: 'darmanitan', url: '/pokemon-species/555/' },
    ]);
  }
  getPokemon(id: number): Observable<Pokemon> {
    return this.failing ? throwError(() => new Error('500')) : of(POKEMON[id]);
  }
}

describe('CompareComponent', () => {
  let query: BehaviorSubject<ParamMap>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    query = new BehaviorSubject(convertToParamMap({ ids: '1,4' }));
    await TestBed.configureTestingModule({
      imports: [CompareComponent],
      providers: [
        provideRouter([]),
        { provide: PokeApiService, useClass: FakePokeApiService },
        { provide: ActivatedRoute, useValue: { queryParamMap: query, snapshot: { queryParamMap: query.value } } },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  function render() {
    const fixture = TestBed.createComponent(CompareComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('shows the Pokémon from ?ids= side by side, with species names', () => {
    query.next(convertToParamMap({ ids: '555,1,1,abc' }));
    const { el } = render();
    expect([...el.querySelectorAll('.slot__name')].map((name) => name.textContent)).toEqual(['darmanitan', 'bulbasaur']);
    expect(el.querySelectorAll('poke-radar .shape')).toHaveLength(2);
  });

  it('compares each stat and the total in a table, highlighting the highest', () => {
    const { el } = render();
    const rows = [...el.querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('th, td')].map((cell) => cell.textContent?.trim()),
    );
    expect(rows[0]).toEqual(['HP', '45', '39']);
    expect(rows[6]).toEqual(['Total', '318', '309']);
    expect(el.querySelector('tbody tr td.best')?.textContent).toBe('45');
  });

  it('adds a Pokémon by name or number, keeping the list in the URL', () => {
    query.next(convertToParamMap({ ids: '1' }));
    const { el, fixture } = render();
    const field = el.querySelector<HTMLInputElement>('#compare-add')!;

    field.value = '#555';
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { ids: '1,555' } }));
    expect(field.value).toBe('');
    expect(el.querySelector('[role="status"]')?.textContent).toContain('darmanitan adicionado');
  });

  it('explains when a Pokémon is not found or already compared', () => {
    const { el, fixture } = render();
    const field = el.querySelector<HTMLInputElement>('#compare-add')!;
    const status = () => el.querySelector('.message')?.textContent;

    field.value = 'agumon';
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(status()).toBe('Nenhum Pokémon encontrado para “agumon”.');

    field.value = 'Charmander';
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(status()).toBe('charmander já está na comparação.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('removes a Pokémon and hides the form once three are compared', () => {
    query.next(convertToParamMap({ ids: '1,4,555' }));
    const { el } = render();
    expect(el.querySelector('form')).toBeNull();

    el.querySelector<HTMLButtonElement>('[aria-label="Remover charmander da comparação"]')!.click();
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { ids: '1,555' } }));
  });

  it('has an empty state and an error state', () => {
    query.next(convertToParamMap({}));
    expect(render().el.querySelector('.state')?.textContent).toContain('Nenhum Pokémon escolhido');

    (TestBed.inject(PokeApiService) as unknown as FakePokeApiService).failing = true;
    query.next(convertToParamMap({ ids: '4' }));
    expect(render().el.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar');
  });
});
