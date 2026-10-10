import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PokeHeaderComponent } from './shared/poke-header/poke-header.component';
import { PokeFooterComponent } from './shared/poke-footer/poke-footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PokeHeaderComponent, PokeFooterComponent],
  template: `
    <poke-header></poke-header>
    <router-outlet></router-outlet>
    <poke-footer></poke-footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'pokedex';
}
