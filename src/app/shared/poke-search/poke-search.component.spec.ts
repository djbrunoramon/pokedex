import { TestBed } from '@angular/core/testing';

import { PokeSearchComponent } from './poke-search.component';

describe('PokeSearchComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function render() {
    const fixture = TestBed.createComponent(PokeSearchComponent);
    const terms: string[] = [];
    fixture.componentInstance.term.subscribe((term) => terms.push(term));
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const type = (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    return { fixture, input, terms, type };
  }

  it('labels the search input', () => {
    const { fixture, input } = render();
    const label: HTMLLabelElement = fixture.nativeElement.querySelector(`label[for="${input.id}"]`);
    expect(label.textContent).toContain('Buscar Pokémon por nome ou número');
    expect(input.type).toBe('search');
  });

  it('emits the term once typing pauses', () => {
    const { terms, type } = render();

    type('p');
    type('pi');
    type('pik');
    vi.advanceTimersByTime(100);
    expect(terms).toEqual([]);

    vi.advanceTimersByTime(60);
    expect(terms).toEqual(['pik']);
  });

  it('does not re-emit an unchanged term', () => {
    const { terms, type } = render();

    type('abra');
    vi.advanceTimersByTime(200);
    type('abr');
    type('abra');
    vi.advanceTimersByTime(200);

    expect(terms).toEqual(['abra']);
  });
});
