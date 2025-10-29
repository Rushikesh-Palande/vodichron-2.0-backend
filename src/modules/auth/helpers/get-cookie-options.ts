/**
 * Cookie Options Helper
 * =====================
 *
 * Provides secure cookie options for refresh token storage.
 */

import { CookieOptions } from 'express';
import { config } from '../../../config';

export function getRefreshCookieOptions(maxAgeMs: number): CookieOptions {
  const isProd = config.isProduction;
  return {
    httpOnly: true,
    secure: isProd,
    // In dev (localhost), SameSite='lax' works across ports; in prod, use 'none' for cross-site
    sameSite: (isProd ? 'none' : 'lax') as CookieOptions['sameSite'],
    // Make cookie available to /trpc endpoints (and others)
    path: '/',
    maxAge: maxAgeMs,
  } as CookieOptions;
}
