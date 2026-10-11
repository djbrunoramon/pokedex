import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay, withNoHttpTransferCache } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

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
  ],
};
