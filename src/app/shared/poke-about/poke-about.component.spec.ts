import { TestBed } from '@angular/core/testing';

import { PokeAboutComponent } from './poke-about.component';
import { Pokemon, PokemonSpecies } from '../../models/pokeapi.model';

const PIKACHU = {
  id: 25,
  abilities: [
    { ability: { name: 'static' }, is_hidden: false },
    { ability: { name: 'lightning-rod' }, is_hidden: true },
  ],
} as Pokemon;

const SPECIES: PokemonSpecies = {
  names: [],
  genera: [
    { genus: 'Pokémon Ratón', language: { name: 'es' } },
    { genus: 'Mouse Pokémon', language: { name: 'en' } },
  ],
  flavor_text_entries: [
    { flavor_text: 'An old\ndescription.', language: { name: 'en' } },
    { flavor_text: 'Una descripción.', language: { name: 'es' } },
    { flavor_text: 'It stores\felectricity\nin its cheeks.', language: { name: 'en' } },
  ],
  evolution_chain: null,
};

describe('PokeAboutComponent', () => {
  function render(species: PokemonSpecies = SPECIES) {
    const fixture = TestBed.createComponent(PokeAboutComponent);
    fixture.componentRef.setInput('pokemon', PIKACHU);
    fixture.componentRef.setInput('species', species);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the English category and the most recent English description, cleaned up', () => {
    const el = render();
    expect(el.querySelector('.category')?.textContent).toBe('Mouse Pokémon');
    expect(el.querySelector('.description')?.textContent).toBe('It stores electricity in its cheeks.');
    expect(el.querySelector('.description')?.getAttribute('lang')).toBe('en');
  });

  it('lists the abilities with readable names, marking the hidden one', () => {
    const items = [...render().querySelectorAll('.abilities li')].map((li) => li.textContent?.trim());
    expect(items).toEqual(['Static', 'Lightning Rod (oculta)']);
  });

  it('leaves out the texts a species does not have in English', () => {
    const el = render({ ...SPECIES, genera: [], flavor_text_entries: [] });
    expect(el.querySelector('.category')).toBeNull();
    expect(el.querySelector('.description')).toBeNull();
  });
});
