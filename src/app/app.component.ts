import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PokeHeaderComponent } from './shared/poke-header/poke-header.component';
import { PokeFooterComponent } from './shared/poke-footer/poke-footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PokeHeaderComponent, PokeFooterComponent],
  template: `
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
}
