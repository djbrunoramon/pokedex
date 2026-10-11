import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { retry } from 'rxjs';

/**
 * While prerendering, retries a failed PokéAPI request a few times: one dropped response
 * would otherwise freeze an error state into a page's HTML. Browsers show the error and
 * a "Tentar novamente" instead.
 */
export const serverRetryInterceptor: HttpInterceptorFn = (req, next) =>
  isPlatformServer(inject(PLATFORM_ID)) ? next(req).pipe(retry({ count: 3, delay: 1000 })) : next(req);
