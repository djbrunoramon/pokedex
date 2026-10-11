import { afterNextRender, ChangeDetectionStrategy, Component, DOCUMENT, inject, input, signal } from '@angular/core';

/**
 * Plays a Pokémon's cry. The PokéAPI's recordings are Ogg Vorbis, which not every browser
 * plays: the button only appears where it works — checked after the first render, so
 * prerendered pages hydrate without it.
 */
@Component({
  selector: 'poke-cry',
  templateUrl: './poke-cry.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeCryComponent {
  private readonly document = inject(DOCUMENT);

  readonly url = input.required<string | null>();
  readonly name = input.required<string>();

  protected readonly supported = signal(false);
  protected readonly playing = signal(false);
  protected readonly status = signal('');

  constructor() {
    afterNextRender(() => {
      const probe = this.document.createElement('audio');
      this.supported.set(!!probe.canPlayType?.('audio/ogg; codecs="vorbis"'));
    });
  }

  protected async play(): Promise<void> {
    const url = this.url();
    if (!url || this.playing()) {
      return;
    }
    const audio = this.document.createElement('audio');
    audio.src = url;
    audio.volume = 0.6;
    audio.addEventListener('ended', () => this.playing.set(false), { once: true });
    this.status.set('');
    this.playing.set(true);
    try {
      await audio.play();
    } catch {
      this.playing.set(false);
      this.status.set('Não foi possível tocar o som.');
    }
  }
}
