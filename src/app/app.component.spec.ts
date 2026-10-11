import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AppComponent } from './app.component';

@Component({ template: '<main tabindex="-1">lista</main>' })
class ListPage {}

@Component({ template: '<main tabindex="-1">detalhe</main>' })
class DetailPage {}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: '', component: ListPage },
          { path: 'details/:id', component: DetailPage },
        ]),
      ],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(AppComponent);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    return fixture;
  }

  const tick = () => new Promise((resolve) => setTimeout(resolve));

  it("has the 'pokedex' title", () => {
    expect(TestBed.createComponent(AppComponent).componentInstance.title).toBe('pokedex');
  });

  it('starts with a skip link that focuses the page content', async () => {
    const fixture = await render();
    const el: HTMLElement = fixture.nativeElement;
    const skip = el.querySelector<HTMLAnchorElement>('a.skip-link')!;
    expect(el.firstElementChild).toBe(skip);
    expect(skip.textContent).toBe('Pular para o conteúdo');

    skip.click();
    expect(document.activeElement).toBe(el.querySelector('main'));
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('moves focus to the content when going to another page, not within one', async () => {
    const fixture = await render();
    const router = TestBed.inject(Router);
    const el: HTMLElement = fixture.nativeElement;
    (document.activeElement as HTMLElement | null)?.blur();

    await router.navigateByUrl('/?q=pika');
    await tick();
    expect(document.activeElement).toBe(document.body);

    await router.navigateByUrl('/details/25');
    await fixture.whenStable();
    await tick();
    expect(document.activeElement?.textContent).toBe('detalhe');

    (document.activeElement as HTMLElement).blur();
    await router.navigateByUrl('/details/26');
    await tick();
    expect(document.activeElement).toBe(document.body);
    expect(el.querySelector('main')?.textContent).toBe('detalhe');
  });
});
