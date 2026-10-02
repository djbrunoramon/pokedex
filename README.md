# Pokedex

A single-page app for browsing Pokémon, built with Angular and powered by the public [PokéAPI](https://pokeapi.co/). The UI is in Portuguese (pt-BR).

## Live preview

[Pokedex on GitHub Pages](https://djbrunoramon.github.io/pokedex/)

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

The app is published to GitHub Pages from the `docs/` folder on `main`.

> **Note:** the `build-github` script is out of date (it still uses the removed `--prod` flag) and needs to be fixed before the next deploy.
