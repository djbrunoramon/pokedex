import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Pokemon } from '../../models/pokeapi.model';
import { DexNumberPipe } from '../pipes/dex-number.pipe';

@Component({
  selector: 'poke-card',
  imports: [RouterLink, DexNumberPipe],
  templateUrl: './poke-card.component.html',
  styleUrls: ['./poke-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeCardComponent {
  readonly pokemon = input.required<Pokemon>();

  protected readonly primaryType = computed(() => this.pokemon().types[0]?.type.name ?? 'normal');
}
