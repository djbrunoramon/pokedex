import { ChangeDetectionStrategy, Component, DOCUMENT, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, pairwise } from 'rxjs';

import { PokeFooterComponent } from './shared/poke-footer/poke-footer.component';
import { PokeHeaderComponent } from './shared/poke-header/poke-header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PokeHeaderComponent, PokeFooterComponent],
  template: `
    <a class="skip-link" href="#conteudo" (click)="skipToContent($event)">Pular para o conteúdo</a>
    <div class="starfield" aria-hidden="true">
      <span class="stars stars--sm"></span>
      <span class="stars stars--md"></span>
      <span class="stars stars--lg"></span>
      <span class="shooting-star"></span>
    </div>
    <poke-header></poke-header>
    <router-outlet></router-outlet>
    <poke-footer></poke-footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'pokedex';

  private readonly document = inject(DOCUMENT);

  constructor() {
    // Moving to another page leaves keyboard and screen-reader users on a link that no longer
    // exists: start them at the new page's content. Not for changes within a page (search,
    // type, order, previous/next Pokémon), which keep focus where the user is working.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map((event) => pageOf(event.urlAfterRedirects)),
        pairwise(),
        filter(([previous, current]) => previous !== current),
        takeUntilDestroyed(),
      )
      .subscribe(() => setTimeout(() => this.focusContent()));
  }

  /** The skip link focuses the content instead of following `#conteudo` (the router would). */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.focusContent();
  }

  private focusContent(): void {
    this.document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
  }
}

/** The kind of page a url shows: `/details/25?x` → `details`, `/?q=pika` → ``. */
function pageOf(url: string): string {
  return url.split(/[?#]/)[0].split('/')[1] ?? '';
}
