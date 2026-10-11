import { expect, test } from '@playwright/test';

// The service worker only exists in a production build: run with E2E_BASE_URL.
test.describe('PWA', () => {
  test.skip(!process.env['E2E_BASE_URL'], 'só no build (E2E_BASE_URL)');

  test('é instalável: manifest com nome, ícones e modo standalone', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifest = await (await request.get(`/${href}`)).json();
    expect(manifest).toMatchObject({ name: 'Pokédex', display: 'standalone', start_url: './' });
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true);
  });

  test('funciona offline com o que já foi visitado', async ({ page, context }) => {
    await page.goto('/details/25');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('pikachu');
    // Registered once the app is stable; wait until it controls the page.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.goto('/');
    await expect(page.locator('.grid poke-card a').first()).toBeVisible();

    await context.setOffline(true);
    await page.goto('/details/25');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('pikachu');
    await expect(page.locator('poke-stats .stats__row--total')).toContainText('320');

    await page.goto('/');
    await expect(page.getByText(/1025 Pokémon encontrados/)).toBeVisible();
  });
});
