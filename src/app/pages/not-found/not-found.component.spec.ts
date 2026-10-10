import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';

import { routes } from '../../app.routes';

describe('NotFoundComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('is shown (instead of a blank page) for an unknown URL', async () => {
    const harness = await RouterTestingHarness.create('/pagina-que-nao-existe');
    const el: HTMLElement = harness.routeNativeElement!;

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Esta página não existe');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/');
    expect(TestBed.inject(Title).getTitle()).toBe('Página não encontrada | Pokédex');
  });
});
