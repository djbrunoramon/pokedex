import { expect, test } from '@playwright/test';

test.describe('comparar', () => {
  test('do detalhe para a comparação, adicionando por nome e por número', async ({ page }) => {
    await page.goto('/details/6');
    await page.getByRole('link', { name: 'Comparar', exact: true }).last().click();
    await expect(page).toHaveURL(/\/comparar\?ids=6$/);
    await expect(page.locator('.slot__name')).toHaveText(['charizard']);

    const field = page.getByLabel('Adicionar Pokémon por nome ou número');
    await field.fill('blastoise');
    await page.getByRole('button', { name: 'Adicionar' }).click();
    await expect(page).toHaveURL(/ids=6%2C9|ids=6,9/);
    await expect(page.getByRole('status').filter({ hasText: 'adicionado' })).toHaveText('blastoise adicionado à comparação.');

    await field.fill('#3');
    await field.press('Enter');
    await expect(page.locator('.slot__name')).toHaveText(['charizard', 'blastoise', 'venusaur']);
    await expect(field).toBeHidden(); // three is the limit

    await expect(page.locator('poke-radar .shape')).toHaveCount(3);
    const total = page.getByRole('row', { name: /Total/ });
    await expect(total.getByRole('cell')).toHaveText(['534', '530', '525']);
    await expect(total.locator('.best')).toHaveText('534');
  });

  test('avisa quando o Pokémon não existe ou já está na comparação, e remove', async ({ page }) => {
    await page.goto('/comparar?ids=25');
    const field = page.getByLabel('Adicionar Pokémon por nome ou número');

    await field.fill('agumon');
    await field.press('Enter');
    await expect(page.getByText('Nenhum Pokémon encontrado para “agumon”.')).toBeVisible();

    await field.fill('pikachu');
    await field.press('Enter');
    await expect(page.getByText('pikachu já está na comparação.')).toBeVisible();

    await page.getByRole('button', { name: 'Remover pikachu da comparação' }).click();
    await expect(page).toHaveURL(/\/comparar$/);
    await expect(page.getByText('Nenhum Pokémon escolhido.')).toBeVisible();
  });
});
