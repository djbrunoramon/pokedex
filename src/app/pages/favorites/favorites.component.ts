import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { PokemonListItem } from '../../models/pokeapi.model';
import { FavoritesService } from '../../service/favorites.service';
import { idFromUrl, PokeApiService } from '../../service/poke-api.service';
import { SeoService } from '../../service/seo.service';
import { PokeCardComponent } from '../../shared/poke-card/poke-card.component';

/** "Meus favoritos": the favourite Pokémon as cards, in Pokédex order. */
@Component({
  selector: 'app-favorites',
  imports: [RouterLink, PokeCardComponent],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesComponent {
  private readonly favorites = inject(FavoritesService);

  /** Index entries (name + url) the cards are made from; `null` if it failed. */
  private readonly index = toSignal(inject(PokeApiService).index().pipe(catchError(() => of(null))));

  protected readonly error = computed(() => this.index() === null);

  /** The favourites' entries; `undefined` until both they and the index are known. */
  protected readonly entries = computed(() => {
    const index = this.index();
    if (!index || !this.favorites.loaded()) {
      return undefined;
    }
    const byId = new Map(index.map((entry): [number, PokemonListItem] => [idFromUrl(entry.url), entry]));
    return this.favorites.ids().flatMap((id) => byId.get(id) ?? []);
  });

  constructor() {
    inject(SeoService).setPage({ title: 'Meus favoritos | Pokédex', path: '/favoritos', noindex: true });
  }
}
