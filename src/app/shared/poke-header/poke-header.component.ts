import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { FavoritesService } from '../../service/favorites.service';
import { ThemeService } from '../../service/theme.service';

/** Top bar: the way home and the app's other pages. */
@Component({
  selector: 'poke-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './poke-header.component.html',
  styleUrls: ['./poke-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeHeaderComponent {
  protected readonly favorites = inject(FavoritesService);
  protected readonly theme = inject(ThemeService);
}
