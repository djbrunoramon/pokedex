import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { firstValueFrom } from 'rxjs';

import { idFromUrl, PokeApiService } from './service/poke-api.service';

/**
 * Prerendered at build time (static output, no server at runtime): the list and every
 * species' detail page, so crawlers and link previews get real HTML. Anything else —
 * unknown URLs — is rendered in the browser from `index.csr.html`.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  {
    path: 'details/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const index = await firstValueFrom(inject(PokeApiService).index());
      return index.map((entry) => ({ id: String(idFromUrl(entry.url)) }));
    },
  },
  { path: '**', renderMode: RenderMode.Client },
];
