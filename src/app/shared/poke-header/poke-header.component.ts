import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'poke-header',
  imports: [RouterLink],
  templateUrl: './poke-header.component.html',
  styleUrls: ['./poke-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeHeaderComponent {}
