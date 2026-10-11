import { expect, test } from '@playwright/test';

const names = '.grid poke-card .card__name';

test.describe('ordenação', () => {
  test('por nome, total de estatísticas e tipo, guardada na URL', async ({ page }) => {
    await page.goto('/');
    const order = page.getByLabel('Ordenar por');
    await expect(order).toHaveValue('');

    await order.selectOption({ label: 'Nome (A–Z)' });
    await expect(page).toHaveURL(/\?ordem=nome$/);
    await expect(page.locator(names).first()).toHaveText('abomasnow');

    await order.selectOption({ label: 'Total de estatísticas' });
    await expect(page).toHaveURL(/\?ordem=total$/);
    await expect(page.locator(names).first()).toHaveText('arceus');

    await order.selectOption({ label: 'Tipo' });
    await expect(page.locator('.grid poke-card').first().locator('.type-chip').first()).toHaveText('Aço');

    await order.selectOption({ label: 'Número' });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(names).first()).toHaveText('bulbasaur');
  });

  test('combina com o filtro de tipo e a busca, e vale num link direto', async ({ page }) => {
    await page.goto('/?tipo=fire&ordem=total&q=char');
    await expect(page.getByLabel('Ordenar por')).toHaveValue('total');
    await expect(page.getByText(/^\s*5 Pokémon encontrados/)).toBeVisible();
    // 534, 405, 309 (#4), 309 (#390: ties go by number), 255
    await expect(page.locator(names)).toHaveText(['charizard', 'charmeleon', 'charmander', 'chimchar', 'charcadet']);
  });
});
