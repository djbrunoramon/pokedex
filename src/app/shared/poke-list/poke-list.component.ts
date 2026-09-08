import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { PokeApiService } from '../../service/poke-api.service';
import { PokemonWithDetail } from '../../models/pokeapi.model';
import { PokeSearchComponent } from '../poke-search/poke-search.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'poke-list',
  imports: [PokeSearchComponent, RouterLink],
  templateUrl: './poke-list.component.html',
  styleUrls: ['./poke-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeListComponent {
  private readonly pokeApiService = inject(PokeApiService);

  protected readonly apiError = signal(false);
  protected readonly query = signal('');

  private readonly allPokemons = toSignal(
    this.pokeApiService.listWithDetails().pipe(
      catchError(() => {
        this.apiError.set(true);
        return of<PokemonWithDetail[]>([]);
      }),
    ),
    { initialValue: [] as PokemonWithDetail[] },
  );

  protected readonly pokemons = computed(() => {
    const q = this.query().toLowerCase();
    return this.allPokemons().filter((pokemon) => !pokemon.name.indexOf(q));
  });

  onSearch(value: string): void {
    this.query.set(value);
  }
}
