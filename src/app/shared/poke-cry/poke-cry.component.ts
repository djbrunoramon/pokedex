import { afterNextRender, ChangeDetectionStrategy, Component, DOCUMENT, effect, inject, input, signal } from '@angular/core';

import { VolumeService } from '../../service/volume.service';

/**
 * Plays a Pokémon's cry at the app's volume, with a slider to set it. The PokéAPI's
 * recordings are Ogg Vorbis, which not every browser plays: the controls only appear where
 * it works — checked after the first render, so prerendered pages hydrate without them.
 */
@Component({
  selector: 'poke-cry',
  templateUrl: './poke-cry.component.html',
  styleUrls: ['./poke-cry.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeCryComponent {
  private readonly document = inject(DOCUMENT);
  protected readonly volume = inject(VolumeService);

  readonly url = input.required<string | null>();
  readonly name = input.required<string>();

  protected readonly supported = signal(false);
  protected readonly playing = signal(false);
  protected readonly status = signal('');

  /** The cry playing now, if any: follows the slider while it plays. */
  private audio: HTMLAudioElement | null = null;

  constructor() {
    afterNextRender(() => {
      const probe = this.document.createElement('audio');
      this.supported.set(!!probe.canPlayType?.('audio/ogg; codecs="vorbis"'));
    });
    effect(() => {
      const level = this.volume.level();
      if (this.audio) {
        this.audio.volume = level;
      }
    });
  }

  protected setVolume(value: string): void {
    this.volume.set(Number(value));
    if (!this.volume.muted()) {
      this.status.set('');
    }
  }

  protected async play(): Promise<void> {
    const url = this.url();
    if (!url || this.playing()) {
      return;
    }
    // Muted: nothing plays (not even silently), and the user is told why.
    if (this.volume.muted()) {
      this.status.set('Som desligado: aumente o volume para ouvir.');
      return;
    }
    const audio = this.document.createElement('audio');
    audio.src = url;
    audio.volume = this.volume.level();
    audio.addEventListener(
      'ended',
      () => {
        this.playing.set(false);
        this.audio = null;
      },
      { once: true },
    );
    this.audio = audio;
    this.status.set('');
    this.playing.set(true);
    try {
      await audio.play();
    } catch {
      this.playing.set(false);
      this.audio = null;
      this.status.set('Não foi possível tocar o som.');
    }
  }
}
