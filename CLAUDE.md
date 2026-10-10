# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`pokedex` is an Angular 22 single-page app that browses Pokémon from the public
[PokéAPI](https://pokeapi.co/api/v2/). UI copy is in Portuguese (pt-BR). There is no
backend in this repo. The live site, `https://pokedex.mocah.com.br/`, is built by Vercel
from `main` (plain `npm run build`, base href `/`); a mirror is the static build committed
to `docs/` and served via GitHub Pages (`https://djbrunoramon.github.io/pokedex/`).

It is **standalone + zoneless**: no NgModules, no `zone.js`, signal-driven change
detection. Build system is `@angular/build:application` (esbuild/Vite); tests run on
Vitest. Requires Node 20.19+ / 22.12+ / 24+ (the repo was migrated on Node 24 via nvm).

## Commands

Package manager is npm (`package-lock.json`).

- `npm start` — dev server at `http://localhost:4200/` (`ng serve`, Vite, development config).
- `npm run build` — production build (default configuration) to `dist/pokedex/browser/`.
- `npm run watch` — incremental development build.
- `npm test` — unit tests via Vitest (jsdom). `ng test` **fails if zero spec files match**
  `**/*.spec.ts`; there must be at least one.
- `npm run test:e2e` — Playwright end-to-end tests in `e2e/*.e2e.ts` (Chromium; run
  `npx playwright install chromium` once). Reuses a running dev server on :4200 or starts
  `npm start`, and calls the **real PokéAPI**. `E2E_BASE_URL=https://… npm run test:e2e`
  tests a deployed site. Cards render a skeleton until their own detail loads, so count
  `.grid > li` items (or assert the "N Pokémon encontrados" text), not card links.
- `npm run build-github` — GitHub Pages deploy build: `ng build --configuration
  production,github-pages` (output straight into `docs/`, base href `/pokedex/`), then
  `scripts/github-pages.mjs` copies `index.html` → `404.html` (Pages serves it for deep
  links, so it must boot the app) and writes `.nojekyll`. Commit `docs/` and push `main`
  (that push also triggers the Vercel deploy).

### Running a single test

`ng test` accepts Vitest passthrough, e.g.
`ng test --include='**/poke-list.component.spec.ts'` or `ng test --filter='searches the whole index'`
(`--filter` is a regex over suite/test names; Vitest's `-- -t` passthrough is not supported).
Specs live next to their subject as `*.spec.ts`; the unit-test builder initializes the
test environment itself (no `src/test.ts`).

## Architecture

### Bootstrap and routing

- `src/main.ts` → `bootstrapApplication(AppComponent, appConfig)`.
- `src/app/app.config.ts` — `ApplicationConfig` providers: `provideZonelessChangeDetection()`,
  `provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }))`,
  `provideHttpClient()`, `provideBrowserGlobalErrorListeners()`.
- `src/app/app.routes.ts` — flat routes: `''` → `HomeComponent`, `details/:id` →
  `DetailsComponent`, `**` → `NotFoundComponent`.
- Every component is standalone with an explicit `imports` array, `ChangeDetectionStrategy.OnPush`,
  and `inject()` for DI. Pages use the `app-` prefix; presentational components in
  `src/app/shared/` keep `poke-*` selectors: `PokeSearchComponent`, `PokeListComponent`,
  `PokeCardComponent`, `PokeStatsComponent`, `PokeAboutComponent`, `PokeEvolutionComponent`.
  Pipes: `DexNumberPipe` (`#025`), `SpritePipe`, `TypeNamePipe` (pt-BR type names, from the
  exported `TYPE_NAMES` map, also the list of known types).

### Data flow

`PokeApiService` (`providedIn: 'root'`, `src/app/service/poke-api.service.ts`) is the only
API layer and is fully typed against `src/app/models/pokeapi.model.ts`. Everything it
fetches is cached in the service and shared with `shareReplay`; a failed request is
evicted so a later call retries.

- `index()` — the whole species index (`/pokemon-species?limit=10000`, names + urls of all
  1025 species) in one request. `idFromUrl(url)` gives the Pokédex number.
- `getPokemon(id)` — `/pokemon/:id`, trimmed by `slim()` to the fields the app reads
  (a new field must be added there too). `refCount: true`: a request nobody waits for is
  cancelled.
- `getPokemonWithSpecies(id)` — `forkJoin` of `getPokemon` and `/pokemon-species/:id`.
- `typeMembers(type)` — ids of a type's Pokémon (`/type/:name`).
- `getEvolutionChain(url)` — `/evolution-chain/:id`. `artworkUrl(id)` builds an official
  artwork url from a Pokédex number.

**Names:** `/pokemon/:id` is a species' default *form*, whose name can differ
(`darmanitan-standard`, `giratina-altered`). Always display the species name — the index
entry's `name` in lists, `species.name` on the details page.

Components:

- `PokeListComponent` — `index` via `toSignal`; `query` and `type` are signals read from
  the URL (`?q=`, `?tipo=`, the single source of truth; `setType()`/`onSearch()` navigate
  with `replaceUrl`). `matches` filters by type (`typeMembers` `rxResource`), then by name
  substring or number, and falls back to look-alike names (Levenshtein, `approximate`).
  Cards render `limit` at a time (`linkedSignal`, reset when the search/type changes);
  `loadMore()` stores the limit in the history entry's state (`listLimit`) so coming back
  restores the same cards, and the router restores the scroll. Infinite scroll is
  `InViewportDirective` on the "Carregar mais" button.
- `PokeCardComponent` — takes an index entry and loads its own detail (`rxResource`), so
  off-screen Pokémon cost nothing. Its link sets history state `{ fromList: true }`.
- `PokeSearchComponent` — debounced `(term)` output; clear button; `/` focuses it.
- `DetailsComponent` — `vm` is `toSignal` of `route.paramMap` → `getPokemonWithSpecies`, a
  `{ pokemon, species, error }` view model (the component is reused across ids). "Voltar"
  goes `location.back()` when the history state says `fromList`, else navigates to `/`.
  Previous/next links and the ←/→ keys navigate with `replaceUrl` and keep the `fromList`
  state, so "Voltar" and the browser's back still reach the list. Panels are child
  components: `poke-stats`, `poke-about` (English texts: the PokéAPI has no pt-BR — a
  product decision), `poke-evolution`.
- Templates handle loading (skeletons), empty and error (`.state` with retry) everywhere.

### Styling

- Global styles only via `src/styles.scss`, which `@use`s the partials in
  `src/config-scss/` (`variables`, `reset`, `rem-calc`, `btn`, `animation`,
  `types`, `state`, `starfield`). Component
  SCSS pulls the `rem-calc()` helper with `@use 'src/config-scss/rem-calc' as *;`,
  resolved through `stylePreprocessorOptions.includePaths: ["."]` in `angular.json`.
- Theme colors are CSS custom properties on `:root` in `config-scss/variables.scss`.
- `rem-calc()` converts px to rem; animation classes (`slideInLeft`, `fadeIn`, …) come
  from `animation.scss` and are applied directly in templates.
- Type colours: `config-scss/types.scss` sets `--type-color` from `[data-type]` and styles
  `.type-chip`. Buttons: `.btn` with `btn__ghost`, `btn__secondary`, `btn__small`
  (`config-scss/btn.scss`); shared states in `state.scss`.
- Per-component style budget is 2kb (warn) / 4kb (error), so keep component styles small —
  move a sizeable block into its own child component (as `poke-stats`/`poke-about`) or a
  global partial rather than growing a page's SCSS.

### TypeScript

Full strict mode, including `strictTemplates`, `noPropertyAccessFromIndexSignature`,
`noImplicitOverride` (see `tsconfig.json`). TypeScript 6.0. PokéAPI responses are typed
via `src/app/models/pokeapi.model.ts` — keep new data handling typed rather than
reintroducing `any`.
