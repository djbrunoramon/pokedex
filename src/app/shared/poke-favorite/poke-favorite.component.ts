import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { FavoritesService } from '../../service/favorites.service';

/** Heart toggle that adds a Pokémon to the favourites or removes it. */
@Component({
  selector: 'poke-favorite',
  templateUrl: './poke-favorite.component.html',
  styleUrls: ['./poke-favorite.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeFavoriteComponent {
  private readonly favorites = inject(FavoritesService);

  readonly id = input.required<number>();
  readonly name = input.required<string>();

  protected readonly active = computed(() => this.favorites.has(this.id()));

  protected toggle(): void {
    this.favorites.toggle(this.id());
  }
}
