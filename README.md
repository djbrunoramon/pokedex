# Pokédex

A single-page app for browsing Pokémon, built with Angular and powered by the public [PokéAPI](https://pokeapi.co/). The UI is in Portuguese (pt-BR).

## Live preview

[Pokédex on GitHub Pages](https://djbrunoramon.github.io/pokedex/)

## Features

- List of the first 100 Pokémon with their sprites and types
- Search by name (prefix match)
- Details page per Pokémon, with data from `/pokemon/:id` and `/pokemon-species/:id`

## Tech stack

- [Angular](https://angular.dev/) 22: standalone components, signals, zoneless change detection
- TypeScript 6 (strict mode)
- SCSS
- [Vitest](https://vitest.dev/) for unit tests

## Requirements

- Node.js 20.19+, 22.12+ or 24+
- npm

## Getting started

```bash
npm install
npm start
```

Then open `http://localhost:4200/`. The app reloads automatically when you change a source file.

## Scripts

| Command         | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `npm start`     | Start the dev server at `http://localhost:4200/`              |
| `npm run build` | Production build to `dist/pokedex/browser/`                   |
| `npm run watch` | Incremental development build                                 |
| `npm test`      | Run the unit tests with Vitest                                |

## Project structure

```
src/
├── app/
│   ├── models/      # PokéAPI response types
│   ├── service/     # PokeApiService (the only API layer)
│   ├── pages/       # Home and Details pages
│   ├── shared/      # Header, search and list components
│   ├── app.config.ts
│   └── app.routes.ts
├── config-scss/     # Global SCSS partials (variables, reset, animations…)
└── styles.scss
```

## Deployment

The app is published to GitHub Pages from the `docs/` folder on `main`. To deploy:

```bash
npm run build-github   # production build into docs/ with base href /pokedex/
git add docs && git commit -m "chore: deploy to GitHub Pages" && git push
```

The script also copies `index.html` to `404.html`, so deep links such as `/pokedex/details/25` (which GitHub Pages answers with `404.html`) still boot the app, and adds `.nojekyll`.
