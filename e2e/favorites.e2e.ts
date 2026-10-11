import { expect, test } from '@playwright/test';

test.describe('favoritos', () => {
  test('favoritar pela lista e pelo detalhe, ver em "Meus favoritos" e remover', async ({ page }) => {
    await page.goto('/');
    const favoritos = page.getByRole('link', { name: /Favoritos/ });
    await expect(favoritos).not.toContainText(/\d/);

    const bulbasaur = page.getByRole('button', { name: 'Favoritar bulbasaur' });
    await bulbasaur.click();
    await expect(bulbasaur).toHaveAttribute('aria-pressed', 'true');
    await expect(favoritos).toContainText('1');

    await page.goto('/details/25');
    const pikachu = page.getByRole('button', { name: 'Favoritar pikachu' });
    await expect(pikachu).toHaveAttribute('aria-pressed', 'false');
    await pikachu.click();
    await expect(favoritos).toContainText('2');

    await favoritos.click();
    await expect(page).toHaveURL(/\/favoritos$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Meus favoritos' })).toBeVisible();
    await expect(page.getByText('2 Pokémon favoritos')).toBeVisible();
    await expect(page.locator('.grid .card__name')).toHaveText(['bulbasaur', 'pikachu']);

    await page.getByRole('button', { name: 'Favoritar bulbasaur' }).click();
    await expect(page.locator('.grid .card__name')).toHaveText(['pikachu']);
    await page.getByRole('button', { name: 'Favoritar pikachu' }).click();
    await expect(page.getByText('Você ainda não tem favoritos.')).toBeVisible();
  });

  test('os favoritos continuam depois de recarregar', async ({ page }) => {
    await page.goto('/details/6');
    await page.getByRole('button', { name: 'Favoritar charizard' }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Favoritar charizard' })).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/favoritos');
    await expect(page.locator('.grid .card__name')).toHaveText(['charizard']);
  });
});
