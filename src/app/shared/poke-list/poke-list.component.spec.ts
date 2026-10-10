import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
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

  /** Every even id is of the requested type; forms beyond the species range come along. */
  typeResponse: (type: string) => Observable<number[]> = () => of([2, 4, 6, 10034]);

  typeMembers(type: string): Observable<number[]> {
    return this.typeResponse(type);
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

    // the button stays (keeps keyboard focus) but is marked done
    expect(more()!.getAttribute('aria-disabled')).toBe('true');
    expect(more()!.textContent).toContain('Todos os Pokémon foram carregados');
    more()!.click();
    await fixture.whenStable();
    expect(cards(fixture).length).toBe(60);
  });

  it('remembers on the history entry how many cards were loaded', async () => {
    const fixture = await render();
    fixture.nativeElement.querySelector('button.more').click();
    await fixture.whenStable();

    expect(TestBed.inject(Location).getState()).toMatchObject({ listLimit: 48 });
  });

  it('restores the loaded cards when coming back to the entry (so the scroll position fits)', async () => {
    await TestBed.inject(Router).navigateByUrl('/', { state: { listLimit: 48 } });

    const fixture = await render();
    expect(cards(fixture).length).toBe(48);

    fixture.componentInstance.onSearch('poke'); // a new search starts from the first page again
    await fixture.whenStable();
    expect(cards(fixture).length).toBe(24);
  });

  it('tells how many of the results are on screen', async () => {
    const fixture = await render();
    expect(fixture.nativeElement.querySelector('.count').textContent).toContain('exibindo 24');
  });

  it('loads the next page when the button scrolls into view', async () => {
    const fixture = await render();
    const button = fixture.debugElement.query((el) => el.nativeElement.matches?.('button.more'));
    button.triggerEventHandler('inViewport');
    await fixture.whenStable();
    expect(cards(fixture).length).toBe(48);
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

    fixture.componentInstance.onSearch('poke'); // 56 matches
    await fixture.whenStable();
    expect(cards(fixture).length).toBe(24);
  });

  it('writes the search to ?q= without adding history entries', async () => {
    const fixture = await render();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');

    fixture.componentInstance.onSearch('pika');
    await fixture.whenStable();
    expect(router.url).toBe('/?q=pika');
    expect(navigate.mock.calls[0][1]).toMatchObject({ replaceUrl: true });

    fixture.componentInstance.onSearch('  ');
    await fixture.whenStable();
    expect(router.url).toBe('/');
  });

  it('follows the URL when it changes from outside (router link, browser back/forward)', async () => {
    const fixture = await render();
    const router = TestBed.inject(Router);
    const input = (): HTMLInputElement => fixture.nativeElement.querySelector('input');

    await router.navigateByUrl('/?q=char');
    await fixture.whenStable();
    expect(input().value).toBe('char');
    expect(cards(fixture).length).toBe(1);

    await router.navigateByUrl('/'); // e.g. a router link
    await fixture.whenStable();
    expect(input().value).toBe('');
    expect(cards(fixture).length).toBe(24);
  });

  it('keeps other query params when searching', async () => {
    const fixture = await render();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?ref=share');

    fixture.componentInstance.onSearch('mew');
    await fixture.whenStable();
    expect(router.url).toBe('/?ref=share&q=mew');
  });

  it('restores the search from ?q= (e.g. coming back from a detail page)', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: PokeListComponent }]),
        { provide: PokeApiService, useClass: FakePokeApiService },
      ],
    });

    const harness = await RouterTestingHarness.create('/?q=char');
    const el: HTMLElement = harness.routeNativeElement!;

    expect(el.querySelector<HTMLInputElement>('input')!.value).toBe('char');
    const names = [...el.querySelectorAll('.card__name')].map((n) => n.textContent);
    expect(names).toEqual(['charmander']);
  });

  it('suggests look-alike names when a misspelled search has no exact match', async () => {
    const fixture = await render();

    fixture.componentInstance.onSearch('charmender');
    await fixture.whenStable();
    expect([...fixture.nativeElement.querySelectorAll('.card__name')].map((n: Element) => n.textContent)).toEqual(['charmander']);
    expect(fixture.nativeElement.querySelector('.count').textContent).toContain('Nenhum resultado exato para “charmender”. Você quis dizer:');

    fixture.componentInstance.onSearch('bulbsa'); // a misspelled start of a name
    await fixture.whenStable();
    expect(cards(fixture)[0].textContent).toContain('bulbasaur');
  });

  it('filters by type from the type buttons, combined with the search, and keeps it in ?tipo=', async () => {
    const fixture = await render();
    const router = TestBed.inject(Router);
    const el: HTMLElement = fixture.nativeElement;
    const fire = el.querySelector<HTMLButtonElement>('.filters [data-type="fire"]')!;
    expect(fire.textContent).toBe('Fogo');

    fire.click();
    await fixture.whenStable();
    expect(router.url).toBe('/?tipo=fire');
    expect(fire.getAttribute('aria-pressed')).toBe('true');
    expect([...el.querySelectorAll('.card__name')].map((n) => n.textContent)).toEqual(['ivysaur', 'charmander', 'poke-6']);

    fixture.componentInstance.onSearch('char');
    await fixture.whenStable();
    expect(cards(fixture).length).toBe(1);

    fire.click(); // pressing the active type again shows every type
    await fixture.whenStable();
    expect(router.url).toBe('/?q=char');
    expect(el.querySelector('.filters [data-type="all"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('ignores an unknown ?tipo=', async () => {
    await TestBed.inject(Router).navigateByUrl('/?tipo=banana');
    const fixture = await render();
    expect(cards(fixture).length).toBe(24);
  });

  it('shows an error state when a type cannot be loaded, and retries it', async () => {
    api.typeResponse = () => throwError(() => new Error('offline'));
    await TestBed.inject(Router).navigateByUrl('/?tipo=ice');
    const fixture = await render();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();

    api.typeResponse = () => of([1]);
    el.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await fixture.whenStable();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(cards(fixture).length).toBe(1);
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
