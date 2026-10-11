import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PokeListComponent } from '../../shared/poke-list/poke-list.component';
import { SeoService } from '../../service/seo.service';

@Component({
  selector: 'app-home',
  imports: [PokeListComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  constructor() {
    inject(SeoService).setPage({ title: 'Pokédex', path: '/' });
  }
}
