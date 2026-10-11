import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay, withNoHttpTransferCache } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { serverRetryInterceptor } from './service/server-retry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideHttpClient(withFetch(), withInterceptors([serverRetryInterceptor])),
    // Prerendered pages are hydrated. PokeApiService transfers its own, trimmed responses
    // (the raw /pokemon payload is ~300 KB), so Angular's HTTP transfer cache is off.
    provideClientHydration(withEventReplay(), withNoHttpTransferCache()),
    // Offline support and installation (ngsw-config.json): the app shell, assets, and the
    // PokéAPI data, artwork and cries already seen are cached.
    provideServiceWorker('ngsw-worker.js', {
      enabled: PWA_ENABLED && !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
