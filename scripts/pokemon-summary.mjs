// Regenerates src/assets/data/pokemon-summary.json (`npm run data`), which the list uses to
// sort by stat total and by type without fetching every Pokémon in the browser.
//
// Format, to stay small: { "<id>": [<stat total>, "<type>", "<second type>"?], … } for every
// species in the PokéAPI index (its default form's stats and types). Run it again when the
// PokéAPI adds species; until then new ones simply sort last.
import { mkdirSync, writeFileSync } from 'node:fs';

const API = 'https://pokeapi.co/api/v2';
const OUT = 'src/assets/data/pokemon-summary.json';
const CONCURRENCY = 20;

async function get(url, attempt = 1) {
  const res = await fetch(url);
  if (res.ok) return res.json();
  if (attempt < 4) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    return get(url, attempt + 1);
  }
  throw new Error(`${res.status} ${url}`);
}

const { results } = await get(`${API}/pokemon-species/?offset=0&limit=10000`);
const ids = results.map(({ url }) => Number(url.split('/').filter(Boolean).pop()));

const summary = {};
for (let i = 0; i < ids.length; i += CONCURRENCY) {
  await Promise.all(
    ids.slice(i, i + CONCURRENCY).map(async (id) => {
      const pokemon = await get(`${API}/pokemon/${id}`);
      const total = pokemon.stats.reduce((sum, { base_stat }) => sum + base_stat, 0);
      summary[id] = [total, ...pokemon.types.map(({ type }) => type.name)];
    }),
  );
}

const sorted = Object.fromEntries(Object.entries(summary).sort(([a], [b]) => a - b));
mkdirSync('src/assets/data', { recursive: true });
writeFileSync(OUT, JSON.stringify(sorted) + '\n');
console.log(`Wrote ${OUT}: ${Object.keys(sorted).length} species`);
