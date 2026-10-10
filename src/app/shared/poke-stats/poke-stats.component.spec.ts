import { TestBed } from '@angular/core/testing';

import { PokeStatsComponent } from './poke-stats.component';
import { PokemonStat } from '../../models/pokeapi.model';

const STATS: PokemonStat[] = [
  { base_stat: 78, stat: { name: 'hp' } },
  { base_stat: 109, stat: { name: 'special-attack' } },
  { base_stat: 300, stat: { name: 'made-up' } },
];

describe('PokeStatsComponent', () => {
  function render(stats: PokemonStat[] = STATS) {
    const fixture = TestBed.createComponent(PokeStatsComponent);
    fixture.componentRef.setInput('stats', stats);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('translates the labels and ends with the total', () => {
    const rows = render().querySelectorAll('.stats__row');
    expect(rows[1].textContent).toContain('Ataque Esp.');
    expect(rows[1].textContent).toContain('109');
    expect(rows[2].textContent).toContain('made-up');
    expect(rows[3].textContent).toContain('Total');
    expect(rows[3].textContent).toContain('487');
  });

  it('scales the bars to the highest base stat, capped at 100%', () => {
    const bars = [...render().querySelectorAll<HTMLElement>('.stats__bar span')].map((bar) => bar.style.width);
    expect(bars).toEqual([`${(78 / 255) * 100}%`, `${(109 / 255) * 100}%`, '100%']);
  });
});
