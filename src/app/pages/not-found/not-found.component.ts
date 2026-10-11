import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { SeoService } from '../../service/seo.service';

/** Shown for any URL the app doesn't know (a mistyped or outdated link). */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  constructor() {
    inject(SeoService).setPage({
      title: 'Página não encontrada | Pokédex',
      path: `/${inject(ActivatedRoute).snapshot.url.map((segment) => segment.path).join('/')}`,
      noindex: true,
    });
  }
}
