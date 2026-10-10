import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PokeListComponent } from '../../shared/poke-list/poke-list.component';

@Component({
  selector: 'app-home',
  imports: [PokeListComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
