import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PokeHeaderComponent } from './poke-header.component';
import { FavoritesService } from '../../service/favorites.service';

describe('PokeHeaderComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PokeHeaderComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('links home and to the favourites, with their count once there are any', () => {
    const fixture = TestBed.createComponent(PokeHeaderComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.brand')?.getAttribute('href')).toBe('/');
    const favorites = el.querySelector<HTMLAnchorElement>('a[href="/favoritos"]')!;
    expect(favorites.querySelector('.badge')).toBeNull();

    TestBed.inject(FavoritesService).toggle(25);
    fixture.detectChanges();
    expect(favorites.querySelector('.badge')?.textContent).toBe('1');
  });

  it('switches the theme with a pressed toggle', () => {
    const fixture = TestBed.createComponent(PokeHeaderComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button[aria-label="Tema claro"]') as HTMLButtonElement;
    const before = button.getAttribute('aria-pressed');

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe(before === 'true' ? 'false' : 'true');
    expect(document.documentElement.getAttribute('data-theme')).toBe(before === 'true' ? 'dark' : 'light');
  });
});
