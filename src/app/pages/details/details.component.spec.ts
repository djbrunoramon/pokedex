import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';

import { DetailsComponent } from './details.component';
import { PokeApiService } from '../../service/poke-api.service';
import { Pokemon, PokemonSpecies } from '../../models/pokeapi.model';

const CHARIZARD: Pokemon = {
  id: 6,
  name: 'charizard',
  height: 17,
  weight: 905,
  sprites: { other: { dream_world: { front_default: 'charizard.svg' } } },
  stats: [
    { base_stat: 78, stat: { name: 'hp' } },
    { base_stat: 109, stat: { name: 'special-attack' } },
  ],
  types: [{ type: { name: 'fire' } }, { type: { name: 'flying' } }],
};

const SPECIES: PokemonSpecies = {
  names: [{ name: 'リザードン', language: { name: 'ja-Hrkt' } }],
};

class FakePokeApiService {
  response: () => Observable<[Pokemon, PokemonSpecies]> = () => of([CHARIZARD, SPECIES]);

  getPokemonWithSpecies(): Observable<[Pokemon, PokemonSpecies]> {
    return this.response();
  }
}

describe('DetailsComponent', () => {
  let api: FakePokeApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsComponent],
      providers: [
        provideRouter([]),
        { provide: PokeApiService, useClass: FakePokeApiService },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: '6' } } } },
      ],
    }).compileComponents();

    api = TestBed.inject(PokeApiService) as unknown as FakePokeApiService;
  });

  it('shows a loading placeholder until the pokemon arrives', () => {
    api.response = () => new Subject<[Pokemon, PokemonSpecies]>();

    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Carregando');
    expect(el.querySelectorAll('.skeleton').length).toBe(2);
    expect(el.querySelector('h1')).toBeNull();
  });

  it('renders the hero, translated stats with bars and the total', () => {
    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('charizard');
    expect(el.querySelector('.hero__number')?.textContent).toContain('#006');
    expect(el.querySelector('.details')?.getAttribute('data-type')).toBe('fire');
    expect(el.querySelectorAll('.hero__types .type-chip').length).toBe(2);
    expect(el.querySelector('.hero__measures')?.textContent).toContain('1,7 m');
    expect(el.querySelector('.hero__measures')?.textContent).toContain('90,5 kg');

    const rows = el.querySelectorAll('.stats__row');
    expect(rows[1].textContent).toContain('Ataque Esp.');
    expect(rows[1].textContent).toContain('109');
    expect(rows[2].textContent).toContain('Total');
    expect(rows[2].textContent).toContain('187');

    const bar = rows[0].querySelector<HTMLElement>('.stats__bar span');
    expect(bar?.style.width).toBe(`${(78 / 255) * 100}%`);

    expect(TestBed.inject(Title).getTitle()).toBe('Charizard | Pokédex');
  });

  it('shows an error state with a way back to the list', () => {
    api.response = () => throwError(() => new Error('404'));

    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Não foi possível carregar este Pokémon');
    expect(alert?.querySelector('a')?.getAttribute('href')).toBe('/');
  });
});
