import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, computed, DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export const VOLUME_STORAGE_KEY = 'pokedex:volume';

/** Starting volume, in percent: the PokéAPI cries are loud. */
export const DEFAULT_VOLUME = 25;

/**
 * Volume of every sound the app plays, in percent (0 = muted), kept in localStorage. Read
 * after the first render, like the favourites, so prerendered pages hydrate cleanly.
 */
@Injectable({
  providedIn: 'root',
})
export class VolumeService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly percentSignal = signal(DEFAULT_VOLUME);

  readonly percent = this.percentSignal.asReadonly();
  /** For `HTMLMediaElement.volume` (0–1). */
  readonly level = computed(() => this.percent() / 100);
  readonly muted = computed(() => this.percent() === 0);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      afterNextRender(() => this.percentSignal.set(this.read()));
    }
  }

  set(percent: number): void {
    const value = clamp(percent);
    this.percentSignal.set(value);
    try {
      this.window?.localStorage.setItem(VOLUME_STORAGE_KEY, String(value));
    } catch {
      // Storage blocked: the volume lasts for this visit.
    }
  }

  private read(): number {
    try {
      const stored = this.window?.localStorage.getItem(VOLUME_STORAGE_KEY);
      return stored === null || stored === undefined || stored === '' || Number.isNaN(Number(stored))
        ? DEFAULT_VOLUME
        : clamp(Number(stored));
    } catch {
      return DEFAULT_VOLUME;
    }
  }
}

function clamp(percent: number): number {
  return Math.round(Math.min(100, Math.max(0, percent)));
}
