import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PokeHeaderComponent } from '../../shared/poke-header/poke-header.component';
import { PokeListComponent } from '../../shared/poke-list/poke-list.component';

@Component({
  selector: 'app-home',
  imports: [PokeHeaderComponent, PokeListComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
