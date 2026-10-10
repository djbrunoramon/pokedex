import { expect, test } from '@playwright/test';

/** Cards render a placeholder until their own detail loads, so count list items. */
const items = '.grid > li';
const cards = '.grid poke-card a';

test.describe('filtro por tipo', () => {
  test('filtra pelo tipo, combina com a busca e volta a todos', async ({ page }) => {
    await page.goto('/');
    const filters = page.getByRole('group', { name: 'Filtrar por tipo' });

    await filters.getByRole('button', { name: 'Fogo' }).click();
    await expect(page).toHaveURL(/tipo=fire/);
    await expect(filters.getByRole('button', { name: 'Fogo' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/^\s*81 Pokémon encontrados/)).toBeVisible();

    await page.getByRole('searchbox').fill('char');
    await expect(page.getByText(/^\s*5 Pokémon encontrados/)).toBeVisible();
    await expect(page.locator(cards)).toContainText(['charmander', 'charmeleon', 'charizard', 'chimchar', 'charcadet']);

    await page.getByRole('searchbox').fill('pika');
    await expect(page.getByText('Nenhum Pokémon do tipo Fogo encontrado para “pika”.')).toBeVisible();

    await filters.getByRole('button', { name: 'Todos' }).click();
    await expect(page).not.toHaveURL(/tipo=/);
    await expect(page.locator(items)).toHaveCount(1);
  });

  test('o tipo do detalhe leva à lista filtrada', async ({ page }) => {
    await page.goto('/details/1');
    await page.getByRole('link', { name: 'Ver todos do tipo Venenoso' }).click();
    await expect(page).toHaveURL(/\/\?tipo=poison/);
    await expect(
      page.getByRole('group', { name: 'Filtrar por tipo' }).getByRole('button', { name: 'Venenoso' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
