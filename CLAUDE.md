# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`pokedex` is an Angular 13.1 single-page app that browses Pokémon from the public
[PokéAPI](https://pokeapi.co/api/v2/). UI copy is in Portuguese (pt-BR). There is no
backend in this repo; the app is deployed as a static build to the committed `docs/`
folder and served via GitHub Pages (`https://djbrunoramon.github.io/pokedex/`).

## Commands

Package manager is npm (`package-lock.json`).

- `npm start` — dev server at `http://localhost:4200/` (`ng serve`, development config).
- `npm run build` — production build to `dist/pokedex/` (production is the default configuration).
- `npm run watch` — incremental development build.
- `npm test` — unit tests via Karma + Jasmine in a real Chrome browser; watches by default.
- `npm run build-github` — build into `docs/` with the GitHub Pages base href. Note: this
  script passes `--prod`, a flag removed in Angular 13; if it fails, build with
  `ng build --output-path=docs --base-href=https://djbrunoramon.github.io/pokedex/` instead.

### Running a single test

Karma has no name filter on the CLI. Either mark the spec with `fdescribe` / `fit`, or
scope the run with `ng test --include='**/some.component.spec.ts'`. `src/test.ts`
auto-discovers every `*.spec.ts` under `src/`. There are currently **no spec files** in
the project, so `npm test` compiles and starts a browser but runs zero tests.

## Architecture

### Module graph and routing

- `AppModule` bootstraps `AppComponent` (just `<router-outlet>`).
- `AppRoutingModule` (`forRoot`) lazy-loads `PagesModule` at path `''`.
- `PagesModule` declares the routed pages and wires `RoutingModule` (`forChild`):
  - `''` → `HomeComponent`
  - `details/:id` → `DetailsComponent`
- `SharedModule` declares and exports the presentational components, all with `poke-*`
  selectors (not the `app` prefix): `PokeHeaderComponent`, `PokeSearchComponent`,
  `PokeListComponent`.

### Data flow

`PokeApiService` (`providedIn: 'root'`) is the only API layer. All responses are typed `any`.

- `apiListAllPokemons()` — GETs the first 100 Pokémon (list of name + url only), then in a
  `tap` side effect fires a nested per-Pokémon GET for each entry and **mutates**
  `result.status` on the list items with the detail response. Subscribers receive the list
  immediately; each item's `.status` fills in asynchronously afterward. Templates must guard
  on `*ngIf="pokemon.status"` before reading nested fields (id, types, sprites).
- `apiGetPokemons(url)` — generic pass-through GET used with an explicit URL.

Component specifics:

- `PokeListComponent` keeps two references: `setAllPokemons` (the source list) and
  `getAllPokemons` (the currently displayed/filtered list). `getSearch(value)` filters
  `setAllPokemons` by name prefix and reassigns `getAllPokemons`.
- `PokeSearchComponent` emits `emmitSearch` (spelling intentional — matched in
  `poke-list.component.html`) on every `keyup`.
- `DetailsComponent` `forkJoin`s `/pokemon/:id` and `/pokemon-species/:id`; `pokemon` is
  therefore a 2-element array `[details, species]`. `isLoading` is set to `true` once data
  has loaded (the name reads inverted), and `apiError` gates an error image.
- Sprite images come from `sprites.other.dream_world.front_default`.

### Styling

- Global styles only via `src/styles.scss`, which `@import`s the partials in
  `src/config-scss/` (`variables`, `reset`, `rem-calc`, `btn`, `animation`).
- Theme colors are CSS custom properties on `:root` in `config-scss/variables.scss`.
- `rem-calc()` SCSS function converts px to rem; animation classes (e.g. `slideInLeft`,
  `fadeIn`) come from `animation.scss` and are applied directly in templates.
- Default component style language is SCSS. Per-component style budget is 2kb (warn) /
  4kb (error), so keep component styles small.

### PokéAPI types

There are **no interfaces or models for PokéAPI responses** anywhere in the codebase.
`PokeApiService` methods return `Observable<any>`, components store results in `any`
fields, and templates reach deep into the raw JSON shape (e.g.
`pokemon[0].sprites.other.dream_world.front_default`, `value.stat.name`). This means the
compiler and `strictTemplates` give no protection against a wrong path or an API change.
When touching data handling, prefer adding proper interfaces (`src/app/model/` or
similar) over extending the `any` usage.

### TypeScript

Full strict mode is on, including `strictTemplates`, `noPropertyAccessFromIndexSignature`,
and `noImplicitOverride` (see `tsconfig.json`) — but see the untyped PokéAPI note above
for where that strictness currently does not reach.
