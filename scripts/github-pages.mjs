// Post-build step for the GitHub Pages deploy (`npm run build-github`, output in docs/).
//
// - 404.html: GitHub Pages serves it for any path that isn't a file (deep links such as
//   /pokedex/details/25, or a refresh on one). A copy of the built index.html — with the
//   bundles — boots the app there, and the router renders the right page.
// - .nojekyll: the site is published with the legacy (Jekyll) pipeline; this serves the
//   files as they are.
import { copyFileSync, writeFileSync } from 'node:fs';

const out = 'docs';

copyFileSync(`${out}/index.html`, `${out}/404.html`);
writeFileSync(`${out}/.nojekyll`, '');

console.log(`GitHub Pages: wrote ${out}/404.html and ${out}/.nojekyll`);
