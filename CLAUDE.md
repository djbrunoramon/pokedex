# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`pokedex` is an Angular 22 single-page app that browses Pokémon from the public
[PokéAPI](https://pokeapi.co/api/v2/). UI copy is in Portuguese (pt-BR). There is no
backend in this repo; the app is deployed as a static build to the committed `docs/`
folder and served via GitHub Pages (`https://djbrunoramon.github.io/pokedex/`).

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
- `npm run build-github` — GitHub Pages deploy build: `ng build --configuration
  production,github-pages` (output straight into `docs/`, base href `/pokedex/`), then
  `scripts/github-pages.mjs` copies `index.html` → `404.html` (Pages serves it for deep
  links, so it must boot the app) and writes `.nojekyll`. Commit `docs/` and push `main`.

### Running a single test

`ng test` accepts Vitest passthrough, e.g.
`ng test --include='**/poke-list.component.spec.ts'` or `ng test -- -t 'filters the list'`.
Specs live next to their subject as `*.spec.ts`; the unit-test builder initializes the
test environment itself (no `src/test.ts`).

## Architecture

### Bootstrap and routing

- `src/main.ts` → `bootstrapApplication(AppComponent, appConfig)`.
- `src/app/app.config.ts` — `ApplicationConfig` providers: `provideZonelessChangeDetection()`,
  `provideRouter(routes)`, `provideHttpClient()`, `provideBrowserGlobalErrorListeners()`.
- `src/app/app.routes.ts` — flat routes: `''` → `HomeComponent`, `details/:id` →
  `DetailsComponent`.
- Every component is standalone with an explicit `imports` array, `ChangeDetectionStrategy.OnPush`,
  and `inject()` for DI. Presentational components keep `poke-*` selectors (not the `app`
  prefix): `PokeHeaderComponent`, `PokeSearchComponent`, `PokeListComponent`.

### Data flow

`PokeApiService` (`providedIn: 'root'`, `src/app/service/poke-api.service.ts`) is the only
API layer and is fully typed against `src/app/models/pokeapi.model.ts`.

- `listWithDetails(): Observable<PokemonWithDetail[]>` — GETs the first 100 Pokémon, then
  `switchMap`s into a `forkJoin` of one detail GET per entry, emitting once **all** have
  resolved. A failed detail call yields `detail: null` (the whole list does not reject).
  This composed stream replaced a pre-migration fire-and-forget nested `subscribe` that
  mutated list items in place — that pattern cannot work under zoneless, since the
  mutation would schedule no change detection.
- `getPokemonWithSpecies(id): Observable<[Pokemon, PokemonSpecies]>` — `forkJoin` of
  `/pokemon/:id` and `/pokemon-species/:id`.

Components consume these streams with `toSignal`:

- `PokeListComponent` — `allPokemons` is `toSignal(listWithDetails())`; `query` is a
  `signal<string>` set by the `(term)` output of `PokeSearchComponent`; the rendered list
  is `pokemons = computed(...)` filtering `allPokemons()` by name prefix. `apiError` is a
  signal flipped by a `catchError`. Template guards each card on `@if (pokemon.detail)`.
- `DetailsComponent` — `vm` is `toSignal` of a `{ pokemon, species, error }` view model
  (`catchError` sets `error: true`). Template: `@if (vm().pokemon; as pokemon)` /
  `@if (vm().error)`. The species display name is `vm().species?.names?.[0]?.name` (first
  entry, which PokéAPI returns in Japanese — unchanged from the original).
- Sprite images come from `sprites.other.dream_world.front_default`.

### Styling

- Global styles only via `src/styles.scss`, which `@use`s the partials in
  `src/config-scss/` (`variables`, `reset`, `rem-calc`, `btn`, `animation`). Component
  SCSS pulls the `rem-calc()` helper with `@use 'src/config-scss/rem-calc' as *;`,
  resolved through `stylePreprocessorOptions.includePaths: ["."]` in `angular.json`.
- Theme colors are CSS custom properties on `:root` in `config-scss/variables.scss`.
- `rem-calc()` converts px to rem; animation classes (`slideInLeft`, `fadeIn`, …) come
  from `animation.scss` and are applied directly in templates.
- Per-component style budget is 2kb (warn) / 4kb (error), so keep component styles small.

### TypeScript

Full strict mode, including `strictTemplates`, `noPropertyAccessFromIndexSignature`,
`noImplicitOverride` (see `tsconfig.json`). TypeScript 6.0. PokéAPI responses are typed
via `src/app/models/pokeapi.model.ts` — keep new data handling typed rather than
reintroducing `any`.
