/**
 * Authentication Constants
 * ========================
 * 
 * Centralized configuration for authentication-related constants.
 * These values control token expiry, session duration, and other auth settings.
 * 
 * Usage:
 * - Import these constants instead of using magic numbers
 * - Modify in one place to affect entire application
 * - Makes code more readable and maintainable
 */

import { config } from '../../../config';

/**
 * JWT Token Configuration
 * -----------------------
 * Controls the lifespan of access tokens and refresh tokens
 */

// Access token expiry time (short-lived for security)
// Default: 30 minutes
export const ACCESS_TOKEN_EXPIRES_IN = config.jwt.accessTokenExpiresIn || '30m';

// Refresh token expiry time in milliseconds (long-lived for convenience)
// Default: 7 days = 7 * 24 * 60 * 60 * 1000 ms
export const REFRESH_TOKEN_MAX_AGE_MS = config.jwt.refreshTokenMaxAgeMs || 7 * 24 * 60 * 60 * 1000;

/**
 * Session Configuration
 * --------------------
 * Settings for session management and cleanup
 */

// How long before a session is considered stale (in milliseconds)
// Default: Same as refresh token expiry
export const SESSION_MAX_AGE_MS = REFRESH_TOKEN_MAX_AGE_MS;

// Session cleanup interval (how often to clean expired sessions)
// Default: 1 hour
export const SESSION_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Cookie Configuration
 * -------------------
 * Settings for HTTP-only refresh token cookies
 */

// Cookie name for refresh token
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

// Cookie path (restricts cookie to specific routes)
export const COOKIE_PATH = '/api/auth';

// Cookie security settings
export const COOKIE_HTTP_ONLY = true;
export const COOKIE_SECURE = config.server.env === 'production'; // HTTPS only in production
export const COOKIE_SAME_SITE: 'strict' | 'lax' | 'none' = 'lax';

/**
 * Time Conversion Helpers
 * -----------------------
 * Helper constants for converting time units
 */

export const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Token Type
 * ----------
 * Standard token type for JWT Bearer authentication
 */
export const TOKEN_TYPE = 'Bearer' as const;

/**
 * Auto-logout Configuration
 * -------------------------
 * Settings for automatic logout behavior
 */

// Time to wait before auto-logout after session expiry (in milliseconds)
// Default: 5 seconds
export const AUTO_LOGOUT_DELAY_MS = 5 * 1000;

/**
 * Password Security
 * ----------------
 * Settings for password hashing and security
 */

// Bcrypt salt rounds (higher = more secure but slower)
// Default: 10 rounds
export const BCRYPT_SALT_ROUNDS = 10;

/**
 * Rate Limiting
 * -------------
 * Settings for preventing brute force attacks
 */

// Maximum login attempts before temporary lockout
export const MAX_LOGIN_ATTEMPTS = 5;

// Lockout duration after max attempts (in milliseconds)
// Default: 15 minutes
export const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;
