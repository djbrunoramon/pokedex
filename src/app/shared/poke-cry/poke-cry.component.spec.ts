import type { MockInstance } from 'vitest';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PokeCryComponent } from './poke-cry.component';
import { DecodedAudio, OGG_VORBIS_DECODER } from '../../service/cry-audio.service';

/** Web Audio as far as the component uses it (jsdom has none): records what is played. */
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state = 'suspended';
  readonly destination = {};
  readonly started: { buffer: unknown; gain: { value: number }; source: EventTarget }[] = [];
  /** Browsers whose Web Audio doesn't read Ogg, like Safari. */
  decodeAudioData = vi.fn(() => Promise.reject(new DOMException('Unsupported', 'EncodingError')));

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  createGain() {
    return { gain: { value: 1 }, connect: vi.fn() };
  }

  createBufferSource() {
    const source = new EventTarget() as EventTarget & Record<string, unknown>;
    source['connect'] = (gain: { gain: { value: number } }) => (source['gain'] = gain.gain);
    source['start'] = () =>
      this.started.push({ buffer: source['buffer'], gain: source['gain'] as { value: number }, source });
    return source;
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate, getChannelData: (channel: number) => data[channel] };
  }
}

const PCM: DecodedAudio = { channelData: [new Float32Array([0.1, 0.2, 0.3])], samplesDecoded: 3, sampleRate: 48000 };

describe('PokeCryComponent', () => {
  let play: MockInstance<HTMLMediaElement['play']>;
  let decoder: ReturnType<typeof vi.fn<(file: Uint8Array) => Promise<DecodedAudio>>>;

  beforeEach(() => {
    localStorage.clear();
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    decoder = vi.fn(() => Promise.resolve(PCM));
    FakeAudioContext.instances = [];
    vi.stubGlobal('AudioContext', FakeAudioContext);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OGG_VORBIS_DECODER, useValue: decoder },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function render(url: string | null, canPlay = 'probably') {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue(canPlay as CanPlayTypeResult);
    const fixture = TestBed.createComponent(PokeCryComponent);
    fixture.componentRef.setInput('url', url);
    fixture.componentRef.setInput('name', 'pikachu');
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick(); // the stored volume is read after the first render
    fixture.detectChanges();
    return fixture;
  }

  /** Lets the fetch → decode → play chain settle. */
  async function settle(fixture: { detectChanges(): void }) {
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve));
    }
    fixture.detectChanges();
  }

  function respondWithFile(url: string) {
    TestBed.inject(HttpTestingController).expectOne(url).flush(new Uint8Array([79, 103, 103, 83]).buffer);
  }

  it('plays the cry at a low volume by default (25%)', () => {
    const fixture = render('https://cries/25.ogg');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Ouvir o som de pikachu');

    button.click();
    expect(play).toHaveBeenCalled();
    const audio = play.mock.contexts[0] as HTMLAudioElement;
    expect(audio.src).toBe('https://cries/25.ogg');
    expect(audio.volume).toBe(0.25);
  });

  it('has a labelled volume slider whose value is stored and used, even mid-cry', () => {
    const fixture = render('https://cries/25.ogg');
    const el: HTMLElement = fixture.nativeElement;
    const slider = el.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(slider.getAttribute('aria-label')).toBe('Volume dos sons');
    expect(el.querySelector('label.volume')?.textContent).toContain('Volume');
    expect(slider.value).toBe('25');
    expect(slider.getAttribute('aria-valuetext')).toBe('25%');

    el.querySelector('button')!.click();
    const audio = play.mock.contexts[0] as HTMLAudioElement;

    slider.value = '70';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(localStorage.getItem('pokedex:volume')).toBe('70');
    expect(slider.getAttribute('aria-valuetext')).toBe('70%');
    expect(audio.volume).toBe(0.7);
  });

  it('starts from the stored volume', () => {
    localStorage.setItem('pokedex:volume', '40');
    const fixture = render('https://cries/25.ogg');
    expect(fixture.nativeElement.querySelector('input[type="range"]').value).toBe('40');
    fixture.nativeElement.querySelector('button').click();
    expect((play.mock.contexts[0] as HTMLAudioElement).volume).toBe(0.4);
  });

  it('plays nothing at volume 0, and says so', () => {
    localStorage.setItem('pokedex:volume', '0');
    const fixture = render('https://cries/25.ogg');
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button span')?.textContent).toBe('🔇');
    expect(el.querySelector('input[type="range"]')?.getAttribute('aria-valuetext')).toBe('Sem som');

    el.querySelector('button')!.click();
    fixture.detectChanges();
    expect(play).not.toHaveBeenCalled();
    expect(el.querySelector('[role="status"]')?.textContent).toBe('Som desligado: aumente o volume para ouvir.');
  });

  it('has no button when there is no recording', () => {
    expect(render(null).nativeElement.querySelector('button, input')).toBeNull();
  });

  describe('where <audio> cannot play Ogg Vorbis (Safari, every iOS browser)', () => {
    it('still shows the button and the slider, and plays the decoded cry at the volume', async () => {
      const fixture = render('https://cries/25.ogg', '');
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('button')?.getAttribute('aria-label')).toBe('Ouvir o som de pikachu');
      expect(el.querySelector('input[type="range"]')).not.toBeNull();

      el.querySelector('button')!.click();
      // The context is started during the click itself, as iOS requires.
      expect(FakeAudioContext.instances[0].state).toBe('running');
      respondWithFile('https://cries/25.ogg');
      await settle(fixture);

      expect(play).not.toHaveBeenCalled();
      expect(decoder).toHaveBeenCalledWith(new Uint8Array([79, 103, 103, 83]));
      const [played] = FakeAudioContext.instances[0].started;
      expect(played.gain.value).toBe(0.25);
      const buffer = played.buffer as { sampleRate: number; getChannelData(channel: number): Float32Array };
      expect(buffer.sampleRate).toBe(48000);
      expect(buffer.getChannelData(0)).toEqual(new Float32Array([0.1, 0.2, 0.3]));
      expect(el.querySelector('button')?.getAttribute('aria-busy')).toBe('true');
    });

    it('follows the slider mid-cry, and decodes each cry only once', async () => {
      const fixture = render('https://cries/25.ogg', '');
      const el: HTMLElement = fixture.nativeElement;
      el.querySelector('button')!.click();
      respondWithFile('https://cries/25.ogg');
      await settle(fixture);
      const context = FakeAudioContext.instances[0];

      const slider = el.querySelector<HTMLInputElement>('input[type="range"]')!;
      slider.value = '60';
      slider.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(context.started[0].gain.value).toBe(0.6);

      // When the cry ends, the next play reuses the decoded audio: no download, no decoding.
      context.started[0].source.dispatchEvent(new Event('ended'));
      el.querySelector('button')!.click();
      await settle(fixture);
      TestBed.inject(HttpTestingController).expectNone('https://cries/25.ogg');
      expect(decoder).toHaveBeenCalledTimes(1);
      expect(context.started).toHaveLength(2);
      expect(context.started[1].buffer).toBe(context.started[0].buffer);
      expect(context.started[1].gain.value).toBe(0.6);
      expect(FakeAudioContext.instances).toHaveLength(1);
    });

    it('uses the browser\'s own decoder when its Web Audio reads Ogg, without the WASM one', async () => {
      const decoded = { sampleRate: 44100 };
      const fixture = render('https://cries/25.ogg', '');
      fixture.nativeElement.querySelector('button').click();
      FakeAudioContext.instances[0].decodeAudioData.mockResolvedValue(decoded as never);
      respondWithFile('https://cries/25.ogg');
      await settle(fixture);
      expect(decoder).not.toHaveBeenCalled();
      expect(FakeAudioContext.instances[0].started[0].buffer).toBe(decoded);
    });

    it('says so when the cry cannot be decoded, and tries again on the next click', async () => {
      decoder.mockRejectedValueOnce(new Error('corrupt'));
      const fixture = render('https://cries/25.ogg', '');
      const el: HTMLElement = fixture.nativeElement;
      el.querySelector('button')!.click();
      respondWithFile('https://cries/25.ogg');
      await settle(fixture);
      expect(el.querySelector('[role="status"]')?.textContent).toBe('Não foi possível tocar o som.');
      expect(el.querySelector('button')?.getAttribute('aria-busy')).toBe('false');

      el.querySelector('button')!.click();
      respondWithFile('https://cries/25.ogg');
      await settle(fixture);
      expect(FakeAudioContext.instances[0].started).toHaveLength(1);
      expect(el.querySelector('[role="status"]')?.textContent).toBe('');
    });

    it('leaves MP3 files (some ".ogg" cries are) to the browser: only Ogg goes to the WASM decoder', async () => {
      const fixture = render('https://cries/25.ogg', '');
      const el: HTMLElement = fixture.nativeElement;
      el.querySelector('button')!.click();
      TestBed.inject(HttpTestingController).expectOne('https://cries/25.ogg').flush(new Uint8Array([255, 251, 148, 196]).buffer);
      await settle(fixture);
      expect(FakeAudioContext.instances[0].decodeAudioData).toHaveBeenCalled();
      expect(decoder).not.toHaveBeenCalled();
      expect(el.querySelector('[role="status"]')?.textContent).toBe('Não foi possível tocar o som.');
    });

    it('says so when the browser has no Web Audio either', async () => {
      vi.stubGlobal('AudioContext', undefined);
      const fixture = render('https://cries/25.ogg', '');
      const el: HTMLElement = fixture.nativeElement;
      el.querySelector('button')!.click();
      await settle(fixture);
      expect(el.querySelector('[role="status"]')?.textContent).toBe('Seu navegador não consegue tocar este som.');
      expect(el.querySelector('button')?.getAttribute('aria-busy')).toBe('false');
    });
  });

  it('decodes instead where <audio> ignores the volume (iOS), even if it reads Ogg', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'volume', 'get').mockReturnValue(1);
    const fixture = render('https://cries/25.ogg');
    fixture.nativeElement.querySelector('button').click();
    respondWithFile('https://cries/25.ogg');
    await settle(fixture);
    expect(play).not.toHaveBeenCalled();
    expect(FakeAudioContext.instances[0].started[0].gain.value).toBe(0.25);
  });

  it('decodes instead when <audio> turns out not to read the file', async () => {
    play.mockRejectedValue(new DOMException('No supported source', 'NotSupportedError'));
    const fixture = render('https://cries/25.ogg');
    fixture.nativeElement.querySelector('button').click();
    await settle(fixture);
    respondWithFile('https://cries/25.ogg');
    await settle(fixture);
    expect(FakeAudioContext.instances[0].started).toHaveLength(1);
  });

  it('says so when the sound cannot be played', async () => {
    play.mockRejectedValue(new Error('NotAllowedError'));
    const fixture = render('https://cries/25.ogg');
    fixture.nativeElement.querySelector('button').click();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toBe('Não foi possível tocar o som.');
  });
});
