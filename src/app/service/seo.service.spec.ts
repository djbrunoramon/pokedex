import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';

import { DEFAULT_DESCRIPTION, SeoService, SITE_URL } from './seo.service';

describe('SeoService', () => {
  let seo: SeoService;
  let head: HTMLHeadElement;
  const content = (selector: string) => head.querySelector(`meta[${selector}]`)?.getAttribute('content');

  beforeEach(() => {
    seo = TestBed.inject(SeoService);
    head = TestBed.inject(DOCUMENT).head;
  });

  it('sets the title, description, canonical url and link-preview tags', () => {
    seo.setPage({ title: 'Pikachu | Pokédex', description: 'Rato elétrico.', path: '/details/25', image: 'https://img/25.png' });

    expect(TestBed.inject(Title).getTitle()).toBe('Pikachu | Pokédex');
    expect(content('name="description"')).toBe('Rato elétrico.');
    expect(content('property="og:title"')).toBe('Pikachu | Pokédex');
    expect(content('property="og:url"')).toBe(`${SITE_URL}/details/25`);
    expect(content('property="og:image"')).toBe('https://img/25.png');
    expect(content('name="twitter:card"')).toBe('summary');
    expect(content('name="twitter:description"')).toBe('Rato elétrico.');
    expect(head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/details/25`);
  });

  it('replaces the tags of the previous page, falling back to the defaults', () => {
    seo.setPage({ title: 'Erro', path: '/x', noindex: true });
    expect(content('name="robots"')).toBe('noindex');

    seo.setPage({ title: 'Pokédex', path: '/' });
    expect(content('name="robots"')).toBeUndefined();
    expect(content('name="description"')).toBe(DEFAULT_DESCRIPTION);
    expect(head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/`);
  });
});
