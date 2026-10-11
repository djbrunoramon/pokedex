import { expect, test } from '@playwright/test';

// Build-time files: only on a built site (E2E_BASE_URL), not on the dev server.
test.describe('SEO do site publicado', () => {
  test.skip(!process.env['E2E_BASE_URL'], 'só no build (E2E_BASE_URL)');

  test('robots.txt e sitemap.xml são arquivos reais', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.headers()['content-type']).toContain('text/plain');
    expect(await robots.text()).toMatch(/^Sitemap: https:\/\/.+\/sitemap\.xml$/m);

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.headers()['content-type']).toContain('xml');
    const xml = await sitemap.text();
    expect(xml).toContain('<urlset');
    expect(xml.match(/<loc>/g)).toHaveLength(1026);
    expect(xml).toMatch(/<loc>https:\/\/[^<]+\/details\/1025<\/loc>/);
  });
});
