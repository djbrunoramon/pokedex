import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, computed, DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const STORAGE_KEY = 'pokedex:favoritos';

/**
 * The user's favourite Pokémon (Pokédex numbers, in order), kept in localStorage and in
 * sync across tabs. Read after the first render: prerendered pages are made without
 * favourites, and hydration must find the DOM the server made.
 */
@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly idsSignal = signal<readonly number[]>([]);
  private readonly loadedSignal = signal(false);

  readonly ids = this.idsSignal.asReadonly();
  /** Whether the stored favourites have been read (always `false` while prerendering). */
  readonly loaded = this.loadedSignal.asReadonly();
  readonly count = computed(() => this.ids().length);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    afterNextRender(() => this.load());
    this.window?.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) {
        this.load();
      }
    });
  }

  has(id: number): boolean {
    return this.ids().includes(id);
  }

  toggle(id: number): void {
    const ids = this.has(id) ? this.ids().filter((other) => other !== id) : [...this.ids(), id].sort((a, b) => a - b);
    this.idsSignal.set(ids);
    try {
      this.window?.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Storage full or blocked (private mode): favourites last for this visit only.
    }
  }

  private load(): void {
    this.idsSignal.set(this.read());
    this.loadedSignal.set(true);
  }

  private read(): number[] {
    try {
      const stored: unknown = JSON.parse(this.window?.localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(stored) ? stored.filter((id): id is number => Number.isInteger(id) && id > 0) : [];
    } catch {
      return [];
    }
  }
}
