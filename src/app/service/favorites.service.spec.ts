import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FavoritesService } from './favorites.service';

const KEY = 'pokedex:favoritos';

describe('FavoritesService', () => {
  beforeEach(() => localStorage.clear());

  /** The stored favourites are read after the first render. */
  async function create(): Promise<FavoritesService> {
    const favorites = TestBed.inject(FavoritesService);
    TestBed.inject(ApplicationRef).tick();
    await TestBed.inject(ApplicationRef).whenStable();
    return favorites;
  }

  it('starts empty and reads the stored favourites after rendering', async () => {
    localStorage.setItem(KEY, JSON.stringify([25, 6]));
    const favorites = TestBed.inject(FavoritesService);
    expect(favorites.ids()).toEqual([]);
    expect(favorites.loaded()).toBe(false);

    TestBed.inject(ApplicationRef).tick();
    expect(favorites.ids()).toEqual([25, 6]);
    expect(favorites.loaded()).toBe(true);
  });

  it('adds in Pokédex order, removes, and stores every change', async () => {
    const favorites = await create();
    favorites.toggle(25);
    favorites.toggle(6);
    expect(favorites.ids()).toEqual([6, 25]);
    expect(favorites.has(25)).toBe(true);
    expect(favorites.count()).toBe(2);

    favorites.toggle(25);
    expect(favorites.ids()).toEqual([6]);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([6]);
  });

  it('ignores corrupt storage', async () => {
    localStorage.setItem(KEY, '{nope');
    expect((await create()).ids()).toEqual([]);

    localStorage.setItem(KEY, JSON.stringify(['25', 7, -1, 1.5]));
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(TestBed.inject(FavoritesService).ids()).toEqual([7]);
  });

  it('follows changes made in another tab', async () => {
    const favorites = await create();
    localStorage.setItem(KEY, JSON.stringify([1]));
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(favorites.ids()).toEqual([1]);
  });
});
