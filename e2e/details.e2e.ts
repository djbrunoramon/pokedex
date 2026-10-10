import { expect, test } from '@playwright/test';

test.describe('detalhe', () => {
  test('mostra dados, estatísticas, sobre e evolução', async ({ page }) => {
    await page.goto('/details/25');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('pikachu');
    await expect(page).toHaveTitle('Pikachu | Pokédex');
    await expect(page.locator('.hero__number')).toHaveText('#025');
    await expect(page.locator('.hero__types')).toContainText('Elétrico');
    await expect(page.locator('poke-stats .stats__row--total')).toContainText('320');
    await expect(page.locator('poke-about')).toContainText('Mouse Pokémon');
    await expect(page.locator('poke-about')).toContainText('Lightning Rod (oculta)');

    const evolution = page.locator('poke-evolution');
    for (const name of ['pichu', 'pikachu', 'raichu']) {
      await expect(evolution.getByRole('link', { name: new RegExp(name, 'i') })).toBeVisible();
    }
    await expect(evolution.locator('[aria-current="page"]')).toContainText('pikachu');
  });

  test('usa o nome da espécie, não o da forma (#555)', async ({ page }) => {
    await page.goto('/details/555');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('darmanitan');
    await expect(page).toHaveTitle('Darmanitan | Pokédex');
  });

  test('anterior/próximo pelos botões e pelas setas', async ({ page }) => {
    await page.goto('/details/25');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('pikachu');

    await page.getByRole('link', { name: /Próximo/ }).click();
    await expect(page).toHaveURL(/\/details\/26$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('raichu');

    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/\/details\/25$/);
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('arbok');
  });

  test('o primeiro não tem anterior', async ({ page }) => {
    await page.goto('/details/1');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('bulbasaur');
    await expect(page.getByRole('link', { name: /Anterior/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Próximo/ })).toBeVisible();
  });

  test('Pokémon inexistente mostra erro com volta à lista', async ({ page }) => {
    await page.goto('/details/999999');
    await expect(page.getByText('Não foi possível carregar este Pokémon.')).toBeVisible();
    await page.getByRole('button', { name: 'Voltar para a lista' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('rota inexistente mostra a página 404', async ({ page }) => {
    await page.goto('/nao-existe');
    await expect(page).toHaveTitle('Página não encontrada | Pokédex');
    await page.getByRole('link', { name: 'Ir para a lista' }).click();
    await expect(page.getByText(/1025 Pokémon encontrados/)).toBeVisible();
  });

  test('em telas < 360px o "Voltar" mostra só a seta', async ({ page }) => {
    await page.setViewportSize({ width: 340, height: 700 });
    await page.goto('/details/25');
    const back = page.getByRole('button', { name: 'Voltar', exact: true });
    await expect(back).toBeVisible();
    await expect(back.locator('.back__label')).toBeHidden();

    await page.setViewportSize({ width: 400, height: 700 });
    await expect(back.locator('.back__label')).toBeVisible();
  });
});
