import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { PokeApiService } from '../../service/poke-api.service';
import { Pokemon, PokemonSpecies } from '../../models/pokeapi.model';

interface DetailsViewModel {
  pokemon: Pokemon | null;
  species: PokemonSpecies | null;
  error: boolean;
}

const EMPTY_VM: DetailsViewModel = { pokemon: null, species: null, error: false };

@Component({
  selector: 'app-details',
  imports: [RouterLink],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly pokeApiService = inject(PokeApiService);

  protected readonly vm = toSignal(
    this.pokeApiService
      .getPokemonWithSpecies(String(this.route.snapshot.params['id']))
      .pipe(
        map(([pokemon, species]): DetailsViewModel => ({ pokemon, species, error: false })),
        catchError(() => of<DetailsViewModel>({ ...EMPTY_VM, error: true })),
      ),
    { initialValue: EMPTY_VM },
  );
}
