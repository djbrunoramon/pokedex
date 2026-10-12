import { expect, test } from '@playwright/test';

test.describe('som do Pokémon', () => {
  test.beforeEach(async ({ page }) => {
    // Records the volume of each sound played, instead of playing it.
    await page.addInitScript(() => {
      const played: number[] = [];
      (window as unknown as { played: number[] }).played = played;
      HTMLMediaElement.prototype.play = function () {
        played.push(this.volume);
        return Promise.resolve();
      };
    });
  });

  const played = (page: import('@playwright/test').Page) =>
    page.evaluate(() => (window as unknown as { played: number[] }).played);

  test('começa baixo (25%), ajusta pelo teclado e guarda o volume', async ({ page }) => {
    await page.goto('/details/25');
    const slider = page.getByRole('slider', { name: 'Volume dos sons' });
    await expect(slider).toHaveValue('25');
    await expect(slider).toHaveAttribute('aria-valuetext', '25%');

    await page.getByRole('button', { name: 'Ouvir o som de pikachu' }).click();
    expect(await played(page)).toEqual([0.25]);

    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveValue('35');
    await expect(slider).toHaveAttribute('aria-valuetext', '35%');

    await page.reload();
    await expect(page.getByRole('slider', { name: 'Volume dos sons' })).toHaveValue('35');
    await page.getByRole('button', { name: 'Ouvir o som de pikachu' }).click();
    expect(await played(page)).toEqual([0.35]);
  });

  test('com o volume em zero nada toca, e o usuário é avisado', async ({ page }) => {
    await page.goto('/details/25');
    const slider = page.getByRole('slider', { name: 'Volume dos sons' });
    await slider.focus();
    await page.keyboard.press('Home');
    await expect(slider).toHaveValue('0');
    await expect(slider).toHaveAttribute('aria-valuetext', 'Sem som');

    await page.getByRole('button', { name: 'Ouvir o som de pikachu' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Som desligado' })).toHaveText(
      'Som desligado: aumente o volume para ouvir.',
    );
    expect(await played(page)).toEqual([]);
  });
});

test.describe('som do Pokémon onde o Ogg Vorbis não toca nativamente (iPhone)', () => {
  const decoded = (page: import('@playwright/test').Page) =>
    page.evaluate(() => (window as unknown as { decoded: { duration: number; gain: number }[] }).decoded);

  test.beforeEach(async ({ page }) => {
    // Like WebKit: neither <audio> nor Web Audio's own decoder reads Ogg Vorbis (MP3 they do),
    // so only the WASM decoder can. Records what Web Audio plays and at which gain.
    await page.addInitScript(() => {
      const record = window as unknown as {
        decoded: { duration: number; gain: number }[];
        gains: GainNode[];
        wasm: () => boolean;
      };
      record.decoded = [];
      record.gains = [];
      HTMLMediaElement.prototype.canPlayType = () => '';
      HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('No Ogg', 'NotSupportedError'));
      const decodeAudioData = BaseAudioContext.prototype.decodeAudioData;
      BaseAudioContext.prototype.decodeAudioData = function (data: ArrayBuffer) {
        const ogg = String.fromCharCode(...new Uint8Array(data, 0, 4)) === 'OggS';
        return ogg ? Promise.reject(new DOMException('No Ogg', 'EncodingError')) : decodeAudioData.call(this, data);
      };
      // The decoder is the app's only WebAssembly.
      let wasm = false;
      const instantiate = WebAssembly.instantiate;
      WebAssembly.instantiate = ((...args: Parameters<typeof instantiate>) => {
        wasm = true;
        return instantiate(...args);
      }) as typeof instantiate;
      record.wasm = () => wasm;
      const createGain = BaseAudioContext.prototype.createGain;
      BaseAudioContext.prototype.createGain = function () {
        const gain = createGain.call(this);
        record.gains.push(gain);
        return gain;
      };
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args: Parameters<AudioBufferSourceNode['start']>) {
        record.decoded.push({ duration: this.buffer!.duration, gain: record.gains.at(-1)!.gain.value });
        start.apply(this, args);
      };
    });
  });

  test('o botão aparece e toca o som (Ogg pelo decodificador WASM), no volume escolhido, baixando-o uma vez só', async ({
    page,
  }) => {
    const downloads: string[] = [];
    page.on('request', (request) => request.url().endsWith('.ogg') && downloads.push(request.url()));

    await page.goto('/details/1'); // Bulbasaur's cry is Ogg Vorbis
    const button = page.getByRole('button', { name: 'Ouvir o som de bulbasaur' });
    await expect(button).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Volume dos sons' })).toBeVisible();

    await button.click();
    await expect.poll(() => decoded(page), { timeout: 15_000 }).toHaveLength(1);
    const [first] = await decoded(page);
    expect(first.duration).toBeGreaterThan(0.3); // real audio came out of the decoder
    expect(first.gain).toBe(0.25);
    expect(await page.evaluate(() => (window as unknown as { wasm: () => boolean }).wasm())).toBe(true);
    await expect(page.getByRole('status').filter({ hasText: /./ })).toHaveCount(0);

    // Once the cry ends, playing it again reuses the decoded audio.
    await expect(button).toHaveAttribute('aria-busy', 'false', { timeout: 10_000 });
    await button.click();
    await expect.poll(() => decoded(page)).toHaveLength(2);
    expect(downloads).toHaveLength(1);
  });

  test('os sons que são MP3 com nome .ogg (Pikachu) tocam sem o decodificador WASM', async ({ page }) => {
    await page.goto('/details/25');
    await page.getByRole('button', { name: 'Ouvir o som de pikachu' }).click();
    await expect.poll(() => decoded(page), { timeout: 15_000 }).toHaveLength(1);
    expect((await decoded(page))[0].duration).toBeGreaterThan(0.3);
    expect(await page.evaluate(() => (window as unknown as { wasm: () => boolean }).wasm())).toBe(false);
  });

  test('sem Web Audio, o botão continua lá e explica que o navegador não toca o som', async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as { AudioContext?: unknown }).AudioContext;
      delete (window as { webkitAudioContext?: unknown }).webkitAudioContext;
    });
    await page.goto('/details/25');
    await page.getByRole('button', { name: 'Ouvir o som de pikachu' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'navegador' })).toHaveText(
      'Seu navegador não consegue tocar este som.',
    );
  });
});
