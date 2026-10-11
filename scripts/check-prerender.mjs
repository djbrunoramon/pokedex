// Post-build check for the prerendered site (`npm run build`, output in dist/pokedex/browser).
//
// Fails the build — so Vercel keeps serving the previous deployment — when a detail page
// was prerendered without its Pokémon (the PokéAPI failed even after retries), instead of
// publishing a frozen "Não foi possível carregar" page.
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const out = 'dist/pokedex/browser';
const ids = readdirSync(`${out}/details`);
const broken = ids.filter((id) => !readFileSync(`${out}/details/${id}/index.html`, 'utf8').includes('class="hero__name"'));

if (!existsSync(`${out}/index.csr.html`) || ids.length === 0 || broken.length) {
  console.error(`Prerender check failed: ${ids.length} detail pages, broken: ${broken.join(', ') || 'none'}`);
  process.exit(1);
}
console.log(`Prerender check: ${ids.length} detail pages OK`);
