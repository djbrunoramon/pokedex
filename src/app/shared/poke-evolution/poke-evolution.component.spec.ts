import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';

import { PokeEvolutionComponent } from './poke-evolution.component';
import { PokeApiService } from '../../service/poke-api.service';
import { EvolutionChain, EvolutionLink } from '../../models/pokeapi.model';

const link = (name: string, id: number, evolves_to: EvolutionLink[] = []): EvolutionLink => ({
  species: { name, url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` },
  evolves_to,
});

/** Eevee branches into several evolutions at the same stage. */
const EEVEE: EvolutionChain = { chain: link('eevee', 133, [link('vaporeon', 134), link('jolteon', 135)]) };

class FakePokeApiService {
  response: () => Observable<EvolutionChain> = () => of(EEVEE);

  getEvolutionChain(): Observable<EvolutionChain> {
    return this.response();
  }
}

describe('PokeEvolutionComponent', () => {
  let api: FakePokeApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PokeApiService, useClass: FakePokeApiService }],
    });
    api = TestBed.inject(PokeApiService) as unknown as FakePokeApiService;
  });

  async function render(chainUrl: string | null = '/evolution-chain/67/') {
    const fixture = TestBed.createComponent(PokeEvolutionComponent);
    fixture.componentRef.setInput('chainUrl', chainUrl);
    fixture.componentRef.setInput('currentId', 134);
    fixture.componentRef.setInput('linkState', { fromList: true });
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the chain stage by stage, with branches side by side, linking each member', async () => {
    const el = await render();

    const stages = [...el.querySelectorAll('.chain__stage')].map((stage) =>
      [...stage.querySelectorAll('.chain__name')].map((name) => name.textContent),
    );
    expect(stages).toEqual([['eevee'], ['vaporeon', 'jolteon']]);

    const vaporeon = el.querySelector('a[href="/details/134"]')!;
    expect(vaporeon.getAttribute('aria-current')).toBe('page');
    expect(vaporeon.textContent).toContain('#134');
    expect(vaporeon.querySelector('img')?.getAttribute('src')).toContain('/official-artwork/134.png');
  });

  it('says when the Pokémon does not evolve', async () => {
    api.response = () => of({ chain: link('tauros', 128) });
    expect((await render()).textContent).toContain('Este Pokémon não evolui');
  });

  it('says when the species has no chain', async () => {
    expect((await render(null)).textContent).toContain('Sem dados de evolução');
  });

  it('shows a placeholder while loading and a message on error', async () => {
    api.response = () => new Subject<EvolutionChain>();
    const loading = TestBed.createComponent(PokeEvolutionComponent);
    loading.componentRef.setInput('chainUrl', '/evolution-chain/1/');
    loading.componentRef.setInput('currentId', 1);
    loading.detectChanges(); // not whenStable: the request never completes
    expect(loading.nativeElement.querySelector('.skeleton')).not.toBeNull();
    loading.destroy();

    api.response = () => throwError(() => new Error('offline'));
    expect((await render()).textContent).toContain('Não foi possível carregar a linha evolutiva');
  });
});
