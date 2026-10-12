import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CACHED_CRIES, CryAudioService, DecodedAudio, OGG_VORBIS_DECODER } from './cry-audio.service';

describe('CryAudioService', () => {
  let service: CryAudioService;
  let http: HttpTestingController;
  let decoder: ReturnType<typeof vi.fn<(file: Uint8Array) => Promise<DecodedAudio>>>;
  /** A context whose Web Audio doesn't read Ogg, as Safari's. */
  const context = {
    decodeAudioData: () => Promise.reject(new DOMException('Unsupported', 'EncodingError')),
    createBuffer: (channels: number, length: number) => ({
      length,
      getChannelData: () => new Float32Array(length),
    }),
  } as unknown as AudioContext;

  beforeEach(() => {
    decoder = vi.fn(() =>
      Promise.resolve({ channelData: [new Float32Array([0.5])], samplesDecoded: 1, sampleRate: 48000 }),
    );
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: OGG_VORBIS_DECODER, useValue: decoder }],
    });
    service = TestBed.inject(CryAudioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function load(url: string): Promise<AudioBuffer> {
    const buffer = service.decoded(url, context);
    // An Ogg file starts with "OggS".
    http.match(url).forEach((request) => request.flush(new Uint8Array([79, 103, 103, 83]).buffer));
    return buffer;
  }

  it('keeps the decoded cries in memory, up to the most recently played ones', async () => {
    const first = await load('cries/1.ogg');
    expect(await load('cries/1.ogg')).toBe(first);

    for (let id = 2; id <= CACHED_CRIES + 1; id++) {
      await load(`cries/${id}.ogg`);
    }
    // Cry 1 was the least recently played: dropped, so it's downloaded and decoded again.
    expect(decoder).toHaveBeenCalledTimes(CACHED_CRIES + 1);
    await load(`cries/${CACHED_CRIES + 1}.ogg`);
    expect(decoder).toHaveBeenCalledTimes(CACHED_CRIES + 1);
    expect(await load('cries/1.ogg')).not.toBe(first);
    expect(decoder).toHaveBeenCalledTimes(CACHED_CRIES + 2);
  });

  it('does not keep a download that failed', async () => {
    const failed = service.decoded('cries/7.ogg', context);
    http.expectOne('cries/7.ogg').error(new ProgressEvent('error'));
    await expect(failed).rejects.toBeTruthy();

    await load('cries/7.ogg');
    expect(decoder).toHaveBeenCalledTimes(1);
  });
});
