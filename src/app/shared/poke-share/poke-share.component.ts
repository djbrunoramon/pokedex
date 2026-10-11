import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input, signal } from '@angular/core';

import { SITE_URL } from '../../service/seo.service';

/**
 * Shares a page through the system share sheet (Web Share API) or, where there is none
 * (most desktops), copies its link and says so.
 */
@Component({
  selector: 'poke-share',
  templateUrl: './poke-share.component.html',
  styleUrls: ['./poke-share.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeShareComponent {
  private readonly navigator = inject(DOCUMENT).defaultView?.navigator;

  readonly title = input.required<string>();
  readonly text = input('');
  /** Path of the page (`/details/25`); shared as its public url. */
  readonly path = input.required<string>();

  protected readonly status = signal('');

  protected async share(): Promise<void> {
    const url = `${SITE_URL}${this.path()}`;
    const data = { title: this.title(), text: this.text(), url };
    try {
      if (this.navigator?.share && (this.navigator.canShare?.(data) ?? true)) {
        await this.navigator.share(data);
      } else {
        await this.navigator?.clipboard.writeText(url);
        this.status.set('Link copiado!');
      }
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.status.set('Não foi possível compartilhar.');
      }
    }
  }
}
