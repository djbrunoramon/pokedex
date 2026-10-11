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
