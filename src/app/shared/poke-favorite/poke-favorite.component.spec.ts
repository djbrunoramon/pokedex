import { TestBed } from '@angular/core/testing';

import { PokeFavoriteComponent } from './poke-favorite.component';
import { FavoritesService } from '../../service/favorites.service';

describe('PokeFavoriteComponent', () => {
  beforeEach(() => localStorage.clear());

  it('toggles the Pokémon in the favourites, exposing the state as a pressed button', () => {
    const fixture = TestBed.createComponent(PokeFavoriteComponent);
    fixture.componentRef.setInput('id', 25);
    fixture.componentRef.setInput('name', 'pikachu');
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Favoritar pikachu');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    button.click();
    fixture.detectChanges();
    expect(TestBed.inject(FavoritesService).ids()).toEqual([25]);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.title).toBe('Remover dos favoritos');

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });
});
