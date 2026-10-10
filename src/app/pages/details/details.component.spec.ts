import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Location } from '@angular/common';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';

import { DetailsComponent } from './details.component';
import { PokeApiService } from '../../service/poke-api.service';
import { Pokemon, PokemonListItem, PokemonSpecies } from '../../models/pokeapi.model';

const CHARIZARD: Pokemon = {
  id: 6,
  name: 'charizard',
  height: 17,
  weight: 905,
  sprites: {
    front_default: null,
    other: { dream_world: { front_default: 'charizard.svg' }, 'official-artwork': { front_default: null } },
  },
  stats: [
    { base_stat: 78, stat: { name: 'hp' } },
    { base_stat: 109, stat: { name: 'special-attack' } },
  ],
  types: [{ type: { name: 'fire' } }, { type: { name: 'flying' } }],
  abilities: [],
};

const SPECIES: PokemonSpecies = {
  names: [{ name: 'リザードン', language: { name: 'ja-Hrkt' } }],
  genera: [{ genus: 'Flame Pokémon', language: { name: 'en' } }],
  flavor_text_entries: [],
  evolution_chain: null,
};

class FakePokeApiService {
  response: () => Observable<[Pokemon, PokemonSpecies]> = () => of([CHARIZARD, SPECIES]);

  getPokemonWithSpecies(id: string): Observable<[Pokemon, PokemonSpecies]> {
    this.requested.push(id);
    return this.response();
  }

  requested: string[] = [];

  /** A Pokédex of 10 species. */
  index(): Observable<PokemonListItem[]> {
    return of(Array.from({ length: 10 }, (_, i) => ({ name: `p${i + 1}`, url: `/pokemon-species/${i + 1}/` })));
  }
}

describe('DetailsComponent', () => {
  let api: FakePokeApiService;
  let params: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({ id: '6' }));
    await TestBed.configureTestingModule({
      imports: [DetailsComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: PokeApiService, useClass: FakePokeApiService },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
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

  it('renders the hero and the base stats', () => {
    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('charizard');
    expect(el.querySelector('.hero__number')?.textContent).toContain('#006');
    expect(el.querySelector('.details')?.getAttribute('data-type')).toBe('fire');
    expect(el.querySelectorAll('.hero__types .type-chip').length).toBe(2);
    expect(el.querySelector('.hero__types')?.textContent).toContain('Voador');
    expect(el.querySelector('.hero__measures')?.textContent).toContain('1,7 m');
    expect(el.querySelector('.hero__measures')?.textContent).toContain('90,5 kg');

    expect(el.querySelectorAll('poke-stats .stats__row').length).toBe(3);

    expect(TestBed.inject(Title).getTitle()).toBe('Charizard | Pokédex');
  });

  it('shows the About and Evolution panels', () => {
    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#about-title')?.textContent).toBe('Sobre');
    expect(el.querySelector('poke-about')?.textContent).toContain('Flame Pokémon');
    expect(el.querySelector('#evolution-title')?.textContent).toBe('Evolução');
    expect(el.querySelector('poke-evolution')?.textContent).toContain('Sem dados de evolução');
  });

  it('shows an error state with a way back to the list', () => {
    api.response = () => throwError(() => new Error('404'));

    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Não foi possível carregar este Pokémon');
    expect(alert?.querySelector('button')?.textContent).toContain('Voltar para a lista');
  });

  it('goes back through history when it was opened from the list', async () => {
    // the list's cards navigate with this state; it also survives reloads and back/forward
    await TestBed.inject(Router).navigateByUrl('/', { state: { fromList: true } });
    const back = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);

    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button.back').click();

    expect(back).toHaveBeenCalled();
  });

  it('opens the list (never leaves the app) when the entry was not opened from the list', async () => {
    // e.g. deep link → in-app navigation → browser back: the app navigated before, but the previous
    // history entry is outside the app
    await TestBed.inject(Router).navigateByUrl('/');
    await TestBed.inject(Router).navigateByUrl('/details/6');
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const back = vi.spyOn(TestBed.inject(Location), 'back');

    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button.back').click();

    expect(navigate).toHaveBeenCalledWith('/');
    expect(back).not.toHaveBeenCalled();
  });

  it('opens the list when it was reached by a deep link', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const back = vi.spyOn(TestBed.inject(Location), 'back');

    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button.back').click();

    expect(navigate).toHaveBeenCalledWith('/');
    expect(back).not.toHaveBeenCalled();
  });

  it('links the previous and next Pokémon, replacing this history entry', () => {
    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.pager a');
    expect([...links].map((a: Element) => a.getAttribute('href'))).toEqual(['/details/5', '/details/7']);
    expect(links[0].textContent).toContain('#005');
    expect(links[1].textContent).toContain('#007');
  });

  it('has no previous link on the first Pokémon and no next link on the last', () => {
    api.response = () => of([{ ...CHARIZARD, id: 1 }, SPECIES]);
    let fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();
    expect([...fixture.nativeElement.querySelectorAll('.pager a')].map((a: Element) => a.getAttribute('rel'))).toEqual(['next']);

    api.response = () => of([{ ...CHARIZARD, id: 10 }, SPECIES]);
    fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();
    expect([...fixture.nativeElement.querySelectorAll('.pager a')].map((a: Element) => a.getAttribute('rel'))).toEqual(['prev']);
  });

  it('loads the new Pokémon when the :id param changes (the component is reused)', () => {
    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();

    params.next(convertToParamMap({ id: '7' }));
    fixture.detectChanges();

    expect(api.requested).toEqual(['6', '7']);
  });

  it('goes to the previous/next Pokémon with the arrow keys, keeping the way back to the list', async () => {
    await TestBed.inject(Router).navigateByUrl('/', { state: { fromList: true } });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(navigate).toHaveBeenLastCalledWith(['/details', 7], { replaceUrl: true, state: { fromList: true } });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(navigate).toHaveBeenLastCalledWith(['/details', 5], { replaceUrl: true, state: { fromList: true } });
  });

  it('links each type to the list filtered by it', () => {
    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();

    const fire: HTMLAnchorElement = fixture.nativeElement.querySelector('.hero__types a');
    expect(fire.getAttribute('href')).toBe('/?tipo=fire');
    expect(fire.textContent).toBe('Fogo');
  });
});
