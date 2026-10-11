import { expect, test } from '@playwright/test';

/** Cards render a placeholder until their own detail loads, so count list items. */
const items = '.grid > li';
const cards = '.grid poke-card a';

test.describe('voltar do detalhe', () => {
  test('"Voltar" restaura os cards carregados e a rolagem', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(items)).toHaveCount(24);

    // Scrolling to the end loads more cards (infinite scroll), as a user would.
    for (let loaded = 24; loaded < 72; loaded += 24) {
      await page.getByRole('button', { name: 'Carregar mais' }).scrollIntoViewIfNeeded();
      await expect(page.locator(items)).toHaveCount(loaded + 24);
    }
    const card = page.locator(cards).nth(60);
    await card.scrollIntoViewIfNeeded();
    const name = (await card.locator('.card__name').textContent())!;
    // Read right before leaving: the scroll may have triggered one more page.
    const count = await page.locator(items).count();
    const scrollY = await page.evaluate(() => scrollY);

    await card.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await page.getByRole('button', { name: 'Voltar', exact: true }).click();

    await expect(page).toHaveURL(/\/$/);
    // The same cards come back (infinite scroll may add a page below, as the restored
    // position is near the end), at the same position, with the opened card on screen.
    await expect.poll(() => page.locator(items).count()).toBeGreaterThanOrEqual(count);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollY - 50);
    expect(await page.evaluate(() => scrollY)).toBeLessThan(scrollY + 50);
    await expect(page.locator(cards).nth(60)).toContainText(name);
    await expect(page.locator(cards).nth(60)).toBeInViewport();
  });

  test('a busca e o filtro continuam ao voltar, mesmo depois de navegar entre vizinhos', async ({ page }) => {
    await page.goto('/?tipo=fire&q=char');
    await expect(page.getByText(/^\s*5 Pokémon encontrados/)).toBeVisible();

    await page.locator(cards).first().click();
    await expect(page).toHaveURL(/\/details\/4$/);
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/\/details\/5$/);

    await page.goBack();
    await expect(page).toHaveURL(/\?tipo=fire&q=char|\?q=char&tipo=fire/);
    await expect(page.getByRole('searchbox')).toHaveValue('char');
    await expect(page.getByText(/^\s*5 Pokémon encontrados/)).toBeVisible();
  });

  test('acesso direto ao detalhe: "Voltar" abre a lista', async ({ page }) => {
    await page.goto('/details/6');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('charizard');
    await page.getByRole('button', { name: 'Voltar', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/1025 Pokémon encontrados/)).toBeVisible();
  });
});
