/**
 * Unit-test setup (angular.json → test.options.setupFiles).
 *
 * Node 25+ has its own Web Storage globals, and they shadow jsdom's, both as the global and
 * as `window.localStorage` (in the jsdom environment `window` is `globalThis`). Without
 * `--localstorage-file`, Node's `localStorage` is unusable: `undefined` on Node 26, an
 * object without the Storage methods on Node 25.
 * Specs and the services under test (through `DOCUMENT.defaultView`) would then have no
 * storage, unlike any browser. This puts jsdom's own storage back — the one Node 24 and
 * older already expose — so the tests behave the same on every supported Node version.
 */
const dom = (globalThis as { jsdom?: { window: Window } }).jsdom;

if (dom) {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true, writable: true });
  }
}
