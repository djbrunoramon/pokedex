import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject, input, signal } from '@angular/core';

import { CryAudioService } from '../../service/cry-audio.service';
import { VolumeService } from '../../service/volume.service';

/**
 * Plays a Pokémon's cry at the app's volume, with a slider to set it. The PokéAPI's
 * recordings are Ogg Vorbis: played by `<audio>` where it can, otherwise decoded and played
 * through Web Audio (iOS) — see `CryAudioService`. The button is there whenever there is a
 * recording; if nothing can play it, the click says so.
 */
@Component({
  selector: 'poke-cry',
  templateUrl: './poke-cry.component.html',
  styleUrls: ['./poke-cry.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokeCryComponent {
  private readonly document = inject(DOCUMENT);
  private readonly cries = inject(CryAudioService);
  protected readonly volume = inject(VolumeService);

  readonly url = input.required<string | null>();
  readonly name = input.required<string>();

  protected readonly playing = signal(false);
  protected readonly status = signal('');

  /** The cry playing now, if any (`<audio>`, or the Web Audio gain): follows the slider. */
  private audio: HTMLAudioElement | null = null;
  private gain: GainNode | null = null;

  constructor() {
    effect(() => {
      const level = this.volume.level();
      if (this.audio) {
        this.audio.volume = level;
      }
      if (this.gain) {
        this.gain.gain.value = level;
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
    this.status.set('');
    this.playing.set(true);
    if (!this.cries.nativePlayback() || !(await this.playNative(url))) {
      await this.playDecoded(url);
    }
  }

  /** False if `<audio>` turned out not to read the file, to try decoding it instead. */
  private async playNative(url: string): Promise<boolean> {
    const audio = this.document.createElement('audio');
    audio.src = url;
    audio.volume = this.volume.level();
    audio.addEventListener('ended', () => this.stopped(), { once: true });
    this.audio = audio;
    try {
      await audio.play();
      return true;
    } catch (error) {
      this.audio = null;
      if ((error as DOMException | null)?.name === 'NotSupportedError') {
        return false;
      }
      this.stopped('Não foi possível tocar o som.');
      return true;
    }
  }

  private async playDecoded(url: string): Promise<void> {
    // Started before anything is awaited: iOS only allows it during the click.
    const context = this.cries.audioContext();
    if (!context) {
      this.stopped('Seu navegador não consegue tocar este som.');
      return;
    }
    try {
      const buffer = await this.cries.decoded(url, context);
      const gain = context.createGain();
      gain.gain.value = this.volume.level();
      gain.connect(context.destination);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.addEventListener('ended', () => this.stopped(), { once: true });
      this.gain = gain;
      source.start();
    } catch {
      this.stopped('Não foi possível tocar o som.');
    }
  }

  private stopped(message = ''): void {
    this.playing.set(false);
    this.audio = null;
    this.gain = null;
    if (message) {
      this.status.set(message);
    }
  }
}
