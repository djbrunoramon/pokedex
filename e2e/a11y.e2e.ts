import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['/', '/?tipo=fire&ordem=total', '/details/25', '/favoritos', '/comparar?ids=1,4,7', '/comparar', '/nao-existe'];

/**
 * axe can't measure contrast through the decorative backgrounds (page glow, starry sky,
 * card halos, the hero's gradient), so they are reduced to their base colours first.
 */
const FLATTEN = `
  body { background: var(--page-bg) !important; }
  .starfield { display: none !important; }
  .card::before, .hero { background-image: none !important; }
  .fadeIn, .fadeInUp, .popIn { animation: none !important; opacity: 1 !important; }
`;

test.describe('acessibilidade (axe, WCAG 2.2 AA)', () => {
  for (const theme of ['dark', 'light']) {
    for (const url of PAGES) {
      test(`${url} no tema ${theme === 'dark' ? 'escuro' : 'claro'}`, async ({ page }) => {
        await page.addInitScript((value) => {
          localStorage.setItem('pokedex:tema', value);
          localStorage.setItem('pokedex:favoritos', '[1,4]');
        }, theme);
        await page.goto(url);
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('[role="status"] .skeleton, .skeleton.grid__placeholder')).toHaveCount(0);
        await page.addStyleTag({ content: FLATTEN });

        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze();
        expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      });
    }
  }
});

test.describe('teclado', () => {
  test('o primeiro Tab é o link para pular ao conteúdo', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.grid poke-card a').first()).toBeVisible();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('searchbox')).toBeFocused();
  });

  test('ao abrir um Pokémon, o foco vai para o conteúdo da nova página', async ({ page }) => {
    await page.goto('/');
    await page.locator('.grid poke-card a').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('bulbasaur');
    await expect(page.locator('main')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Voltar', exact: true })).toBeFocused();
  });

  test('"?" abre os atalhos, o foco fica no diálogo e Esc devolve o foco', async ({ page }) => {
    await page.goto('/details/25');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('pikachu');
    await page.keyboard.press('?');
    const dialog = page.getByRole('dialog', { name: 'Atalhos de teclado' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Fechar' })).toBeFocused();

    await page.keyboard.press('ArrowRight'); // stays in the dialog
    await expect(page).toHaveURL(/\/details\/25$/);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('o contorno de foco tem contraste nos dois temas', async ({ page }) => {
    for (const [theme, color] of [['dark', 'rgb(255, 84, 115)'], ['light', 'rgb(214, 58, 90)']]) {
      await page.addInitScript((value) => localStorage.setItem('pokedex:tema', value), theme);
      await page.goto('/');
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
      await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineColor);
      expect(outline).toBe(color);
    }
  });
});
