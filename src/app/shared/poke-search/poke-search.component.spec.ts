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

  it('shows an initial value (a search restored from the URL)', () => {
    const fixture = TestBed.createComponent(PokeSearchComponent);
    fixture.componentRef.setInput('value', 'mew');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input').value).toBe('mew');
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

  it('follows outside changes to the value when the field is not focused', () => {
    const { fixture, input } = render();

    fixture.componentRef.setInput('value', 'char');
    fixture.detectChanges();
    expect(input.value).toBe('char');

    fixture.componentRef.setInput('value', '');
    fixture.detectChanges();
    expect(input.value).toBe('');
  });

  it('never overwrites what the user is typing', () => {
    const { fixture, input } = render();
    input.focus();
    input.value = 'pika';

    fixture.componentRef.setInput('value', 'pik'); // a stale debounced term arriving late
    fixture.detectChanges();

    expect(input.value).toBe('pika');
  });
});
