import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';

import { PokeCardComponent } from './poke-card.component';
import { PokeApiService } from '../../service/poke-api.service';
import { Pokemon } from '../../models/pokeapi.model';

const PIKACHU: Pokemon = {
  id: 25,
  name: 'pikachu',
  height: 4,
  weight: 60,
  stats: [],
  types: [{ type: { name: 'electric' } }],
  sprites: {
    front_default: 'pixel.png',
    other: { dream_world: { front_default: null }, 'official-artwork': { front_default: 'art.png' } },
  },
};

class FakePokeApiService {
  response: () => Observable<Pokemon> = () => of(PIKACHU);

  getPokemon(): Observable<Pokemon> {
    return this.response();
  }
}

describe('PokeCardComponent', () => {
  let api: FakePokeApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokeCardComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: PokeApiService, useClass: FakePokeApiService },
      ],
    }).compileComponents();

    api = TestBed.inject(PokeApiService) as unknown as FakePokeApiService;
  });

  function render() {
    const fixture = TestBed.createComponent(PokeCardComponent);
    fixture.componentRef.setInput('entry', {
      name: 'pikachu',
      url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
    });
    return fixture;
  }

  it('shows a placeholder while the detail loads', async () => {
    api.response = () => new Subject<Pokemon>();
    const fixture = render();
    fixture.detectChanges(); // whenStable() would wait for the never-resolving request

    expect(fixture.nativeElement.querySelector('.skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });

  it('renders the loaded pokemon with a fallback sprite', async () => {
    const fixture = render();
    await fixture.whenStable();

    const card: HTMLElement = fixture.nativeElement.querySelector('a.card');
    expect(card.textContent).toContain('#025');
    expect(card.textContent).toContain('pikachu');
    expect(card.getAttribute('data-type')).toBe('electric');
    expect(card.getAttribute('href')).toBe('/details/25');

    // marks the detail's history entry so its "Voltar" can go back to the list
    const router = TestBed.inject(Router);
    card.click();
    await fixture.whenStable();
    expect(router.url).toBe('/details/25');
    expect(TestBed.inject(Location).getState()).toMatchObject({ fromList: true });
    expect(card.querySelector('img')?.getAttribute('src')).toBe('art.png');
    expect(card.querySelector('img')?.getAttribute('loading')).toBe('lazy');
  });

  it('loads the image eagerly for priority (above-the-fold) cards', async () => {
    const fixture = render();
    fixture.componentRef.setInput('priority', true);
    await fixture.whenStable();

    const img: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });

  it('falls back to the index name when the detail fails', async () => {
    api.response = () => throwError(() => new Error('500'));
    const fixture = render();
    await fixture.whenStable();

    const card: HTMLElement = fixture.nativeElement.querySelector('a.card--error');
    expect(card.textContent).toContain('pikachu');
    expect(card.textContent).toContain('Não foi possível carregar');
  });
});
