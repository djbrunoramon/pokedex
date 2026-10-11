import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/** Public origin of the site: canonical and link-preview urls must be absolute. */
export const SITE_URL = 'https://pokedex.mocah.com.br';

const SITE_NAME = 'Pokédex';

export const DEFAULT_DESCRIPTION =
  'Pokédex: explore os 1025 Pokémon da Pokédex nacional: tipos, estatísticas e evoluções, com dados da PokéAPI.';

const DEFAULT_IMAGE = `${SITE_URL}/assets/icons/apple-touch-icon.png`;

export interface PageMeta {
  title: string;
  description?: string;
  /** Path of the page (`/details/25`), for the canonical url. */
  path: string;
  /** Absolute url of the preview image. */
  image?: string;
  /** Pages search engines shouldn't list (errors, unknown urls). */
  noindex?: boolean;
}

/**
 * Title, description, canonical url and the OpenGraph / Twitter Card tags that link
 * previews read. Set while prerendering, so they are in each page's HTML.
 */
@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);

  setPage({ title, description = DEFAULT_DESCRIPTION, path, image = DEFAULT_IMAGE, noindex = false }: PageMeta): void {
    const url = `${SITE_URL}${path}`;
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    for (const [property, content] of [
      ['og:type', 'website'],
      ['og:site_name', SITE_NAME],
      ['og:locale', 'pt_BR'],
      ['og:title', title],
      ['og:description', description],
      ['og:url', url],
      ['og:image', image],
    ]) {
      this.meta.updateTag({ property, content });
    }
    for (const [name, content] of [
      ['twitter:card', 'summary'],
      ['twitter:title', title],
      ['twitter:description', description],
      ['twitter:image', image],
    ]) {
      this.meta.updateTag({ name, content });
    }
    if (noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
    } else {
      this.meta.removeTag("name='robots'");
    }
    this.canonical().setAttribute('href', url);
  }

  private canonical(): HTMLLinkElement {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    return link;
  }
}
