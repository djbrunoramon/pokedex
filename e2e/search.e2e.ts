import { expect, test } from '@playwright/test';

/** Cards render a placeholder until their own detail loads, so count list items. */
const items = '.grid > li';
const cards = '.grid poke-card a';

test.describe('busca', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/1025 Pokémon encontrados/)).toBeVisible();
  });

  test('"/" foca a busca e digitar filtra a lista pela URL', async ({ page }) => {
    await page.keyboard.press('/');
    const search = page.getByRole('searchbox');
    await expect(search).toBeFocused();

    await page.keyboard.type('pika');
    await expect(page).toHaveURL(/\?q=pika/);
    await expect(page.locator(items)).toHaveCount(1);
    await expect(page.locator(cards).first()).toContainText('pikachu');
  });

  test('busca pelo número', async ({ page }) => {
    await page.getByRole('searchbox').fill('#150');
    await expect(page.locator(items)).toHaveCount(1);
    await expect(page.locator(cards).first()).toContainText('mewtwo');
  });

  test('sugere nomes parecidos quando não há resultado exato', async ({ page }) => {
    await page.getByRole('searchbox').fill('pikachuu');
    await expect(page.getByText('Nenhum resultado exato para “pikachuu”. Você quis dizer:')).toBeVisible();
    await expect(page.locator(cards).first()).toContainText('pikachu');
  });

  test('mostra o estado vazio e o botão de limpar volta à lista completa', async ({ page }) => {
    await page.getByRole('searchbox').fill('xyzxyz');
    await expect(page.getByText('Nenhum Pokémon encontrado para “xyzxyz”.')).toBeVisible();

    await page.getByRole('button', { name: 'Limpar busca' }).click();
    await expect(page.getByRole('searchbox')).toHaveValue('');
    await expect(page.getByRole('searchbox')).toBeFocused();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/1025 Pokémon encontrados/)).toBeVisible();
  });
});
