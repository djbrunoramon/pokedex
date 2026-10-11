// Post-build step for the prerendered site (`npm run build`, output in dist/pokedex/browser).
//
// Writes robots.txt and sitemap.xml as real files — without them the host's fallback
// answers both with the app's HTML. The sitemap lists exactly the prerendered pages
// (Angular's prerendered-routes.json). SITE_URL overrides the public origin.
import { readFileSync, writeFileSync } from 'node:fs';

const site = (process.env.SITE_URL ?? 'https://pokedex.mocah.com.br').replace(/\/$/, '');
const out = 'dist/pokedex/browser';

const routes = Object.keys(JSON.parse(readFileSync('dist/pokedex/prerendered-routes.json', 'utf8')).routes).sort(
  (a, b) => (Number(a.split('/').pop()) || 0) - (Number(b.split('/').pop()) || 0),
);

const urls = routes.map((route) => `  <url><loc>${site}${route}</loc></url>`).join('\n');
writeFileSync(
  `${out}/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
writeFileSync(`${out}/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);

console.log(`SEO files: robots.txt and sitemap.xml with ${routes.length} URLs (${site})`);
