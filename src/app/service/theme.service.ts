import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';

export type Theme = 'dark' | 'light';

/** Also read by the inline script in index.html, which applies the theme before first paint. */
export const THEME_STORAGE_KEY = 'pokedex:tema';

/** Browser UI colour (address bar, installed app) per theme: the page background. */
const THEME_COLORS: Record<Theme, string> = { dark: '#262835', light: '#eef0f7' };

/**
 * Light or dark theme, as `data-theme` on <html>. Starts from what index.html's script
 * applied (the stored choice, else the system preference); toggling stores the choice.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly themeSignal = signal<Theme>(
    this.document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
  );

  readonly theme = this.themeSignal.asReadonly();

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.apply(this.theme());
    }
  }

  toggle(): void {
    const theme: Theme = this.theme() === 'light' ? 'dark' : 'light';
    this.themeSignal.set(theme);
    this.apply(theme);
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage blocked: the theme lasts for this visit.
    }
  }

  private apply(theme: Theme): void {
    this.document.documentElement.setAttribute('data-theme', theme);
    this.meta.updateTag({ name: 'theme-color', content: THEME_COLORS[theme] });
  }
}
