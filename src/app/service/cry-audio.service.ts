import { HttpClient } from '@angular/common/http';
import { DOCUMENT, inject, Injectable, InjectionToken } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** PCM audio decoded from an Ogg Vorbis file. */
export interface DecodedAudio {
  channelData: Float32Array[];
  samplesDecoded: number;
  sampleRate: number;
}

/**
 * Decodes an Ogg Vorbis file in WebAssembly, for browsers that can't (WebKit, so every
 * browser on iOS). The decoder is downloaded the first time it's needed, not with the app.
 */
export const OGG_VORBIS_DECODER = new InjectionToken<(file: Uint8Array) => Promise<DecodedAudio>>(
  'OGG_VORBIS_DECODER',
  {
    providedIn: 'root',
    factory: () => async (file) => {
      const { OggVorbisDecoder } = await import('@wasm-audio-decoders/ogg-vorbis');
      const decoder = new OggVorbisDecoder();
      try {
        await decoder.ready;
        return await decoder.decodeFile(file);
      } finally {
        decoder.free();
      }
    },
  },
);

/** Decoded cries kept in memory: the most recently played ones. */
export const CACHED_CRIES = 30;

/** Web Audio as the window may have it: unprefixed or not, and the iOS audio session. */
interface AudioWindow {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
  navigator: { audioSession?: { type: string } };
}

/**
 * How the PokéAPI cries are played. They are Ogg Vorbis, though a few are MP3 under the same
 * name. `<audio>` where it plays Ogg at the app's volume; elsewhere the file is decoded — by
 * the browser's Web Audio if it can (MP3 everywhere, Ogg in some), else by the WASM decoder —
 * and played through Web Audio, which every current browser has.
 */
@Injectable({
  providedIn: 'root',
})
export class CryAudioService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly http = inject(HttpClient);
  private readonly decode = inject(OGG_VORBIS_DECODER);

  private native?: boolean;
  private context?: AudioContext | null;
  private readonly buffers = new Map<string, Promise<AudioBuffer>>();

  /**
   * Whether `<audio>` plays Ogg Vorbis and follows the volume: iOS keeps every media element
   * at full volume, so even with Ogg support it goes through Web Audio.
   */
  nativePlayback(): boolean {
    if (this.native === undefined) {
      const probe = this.window?.document.createElement('audio');
      if (probe?.canPlayType?.('audio/ogg; codecs="vorbis"')) {
        probe.volume = 0.5;
        this.native = probe.volume === 0.5;
      } else {
        this.native = false;
      }
    }
    return this.native;
  }

  /**
   * The app's audio context, started — call it from the click itself: iOS only lets audio
   * start during a user gesture. Null without Web Audio.
   */
  audioContext(): AudioContext | null {
    if (this.context === undefined) {
      const window = this.window as AudioWindow | null;
      const Context = window?.AudioContext ?? window?.webkitAudioContext;
      this.context = Context ? new Context() : null;
      // iOS: play with the silent switch on, as `<audio>` does (Safari 17+).
      if (window?.navigator.audioSession) {
        window.navigator.audioSession.type = 'playback';
      }
    }
    const context = this.context;
    if (context && context.state !== 'running') {
      context.resume().catch(() => undefined);
    }
    return context;
  }

  /** The cry decoded for `context`, kept for the next plays; a failure is retried next time. */
  decoded(url: string, context: AudioContext): Promise<AudioBuffer> {
    let buffer = this.buffers.get(url);
    if (buffer) {
      this.buffers.delete(url); // most recently used last
    } else {
      buffer = this.load(url, context);
      buffer.catch(() => this.buffers.get(url) === buffer && this.buffers.delete(url));
    }
    this.buffers.set(url, buffer);
    if (this.buffers.size > CACHED_CRIES) {
      this.buffers.delete(this.buffers.keys().next().value!);
    }
    return buffer;
  }

  private async load(url: string, context: AudioContext): Promise<AudioBuffer> {
    const file = new Uint8Array(await firstValueFrom(this.http.get(url, { responseType: 'arraybuffer' })));
    try {
      // The browser's own decoder, if it reads the file (it detaches the buffer it gets: a copy).
      return await context.decodeAudioData(file.slice().buffer);
    } catch (error) {
      // Some ".ogg" cries are really MP3, which every browser reads: only Ogg needs the WASM.
      if (!isOgg(file)) {
        throw error;
      }
      const { channelData, samplesDecoded, sampleRate } = await this.decode(file);
      if (!samplesDecoded || !channelData.length) {
        throw new Error(`Could not decode ${url}`);
      }
      const buffer = context.createBuffer(channelData.length, samplesDecoded, sampleRate);
      channelData.forEach((samples, channel) => buffer.getChannelData(channel).set(samples.subarray(0, samplesDecoded)));
      return buffer;
    }
  }
}

/** Ogg files start with the "OggS" capture pattern. */
function isOgg(file: Uint8Array): boolean {
  return String.fromCharCode(...file.subarray(0, 4)) === 'OggS';
}
