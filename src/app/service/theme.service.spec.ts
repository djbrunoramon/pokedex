import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let html: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    html = TestBed.inject(DOCUMENT).documentElement;
    html.removeAttribute('data-theme');
  });

  const themeColor = () => TestBed.inject(DOCUMENT).head.querySelector('meta[name="theme-color"]')?.getAttribute('content');

  it('starts from the theme the page was opened with (dark by default)', () => {
    html.setAttribute('data-theme', 'light');
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
    expect(themeColor()).toBe('#eef0f7');
  });

  it('toggles between dark and light, storing the choice', () => {
    const theme = TestBed.inject(ThemeService);
    expect(theme.theme()).toBe('dark');

    theme.toggle();
    expect(theme.theme()).toBe('light');
    expect(html.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(themeColor()).toBe('#eef0f7');

    theme.toggle();
    expect(html.getAttribute('data-theme')).toBe('dark');
    expect(themeColor()).toBe('#262835');
  });
});
