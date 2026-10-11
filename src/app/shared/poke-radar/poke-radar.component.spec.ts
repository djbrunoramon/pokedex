import { TestBed } from '@angular/core/testing';

import { PokeRadarComponent } from './poke-radar.component';

describe('PokeRadarComponent', () => {
  it('draws the six stat axes and one polygon per Pokémon', () => {
    const fixture = TestBed.createComponent(PokeRadarComponent);
    fixture.componentRef.setInput('series', [
      { name: 'blissey', color: 'red', values: [255, 10, 10, 75, 135, 55] },
      { name: 'shuckle', color: 'blue', values: [20, 10, 230, 10, 230, 5] },
    ]);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect([...el.querySelectorAll('.label')].map((label) => label.textContent?.trim())).toEqual([
      'HP', 'Ataque', 'Defesa', 'Ataque Esp.', 'Defesa Esp.', 'Velocidade',
    ]);
    const shapes = el.querySelectorAll('.shape');
    expect(shapes).toHaveLength(2);
    // Blissey's HP (255, the highest base stat) reaches the outer ring: straight up, 110 away.
    expect(shapes[0].getAttribute('points')?.split(' ')[0]).toBe('150.0,40.0');
    expect(el.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('scales to the highest stat compared, rounded up to 50, so close Pokémon stay apart', () => {
    const fixture = TestBed.createComponent(PokeRadarComponent);
    fixture.componentRef.setInput('series', [{ name: 'pikachu', color: 'red', values: [35, 55, 40, 50, 50, 90] }]);
    fixture.detectChanges();
    // Scale 100: HP 35 is 35% of the radius (38.5 above the center).
    const hp = fixture.nativeElement.querySelector('.shape').getAttribute('points').split(' ')[0];
    expect(hp).toBe('150.0,111.5');
  });
});
