/**
 * Generate Token Helper for Vodichron HRMS
 * =========================================
 *
 * Issues short-lived JWT access tokens for authenticated users.
 * These tokens are used for API authorization after login.
 * 
 * Security Features:
 * - HS256 signing algorithm (HMAC with SHA-256)
 * - Server-side secret key (never exposed to client)
 * - Minimal claims payload (only essential user data)
 * - Short expiry window (configurable via JWT_ACCESS_TOKEN_EXPIRES_IN env var)
 * - Stateless verification (no database lookup needed)
 * 
 * Token Structure:
 * ```
 * Header: { alg: "HS256", typ: "JWT" }
 * Payload: {
 *   user: { uuid, role, email, type },
 *   iat: issued_at_timestamp,
 *   exp: expiration_timestamp
 * }
 * Signature: HMACSHA256(base64(header) + "." + base64(payload), secret)
 * ```
 * 
 * Used By:
 * - Login flows (employee and customer)
 * - Session extension (refresh token flow)
 * - Protected route middleware (verify-token.ts)
 */

import { sign, type SignOptions, type Secret } from 'jsonwebtoken';
import { config } from '../../../config';
import { logger } from '../../../utils/logger';
import { ACCESS_TOKEN_EXPIRES_IN } from '../constants/auth.constants';

/**
 * JWT User Payload
 * ----------------
 * Structured subject embedded in access tokens
 */
export interface JwtUserPayload {
  uuid: string;                  // Unique subject identifier (user uuid or customer id)
  role: string;                  // Role (super_user, hr, employee, customer, manager, director)
  email?: string;                // Optional convenience claim
  type: 'employee' | 'customer'; // Subject type
}

/**
 * Generate Access Token
 * ---------------------
 * Creates a signed JWT with an expiration window.
 */
export function generateToken(payload: JwtUserPayload, expiresIn: SignOptions['expiresIn'] = ACCESS_TOKEN_EXPIRES_IN): string {
  const secret: Secret = config.security.sessionSecret as unknown as Secret;
  const token = sign({ user: payload }, secret, { expiresIn });
  logger.debug('🔐 Access token generated', {
    type: 'AUTH_TOKEN_CREATE',
    role: payload.role,
    subjectType: payload.type,
  });
  return token;
}

/**
 * Expire Access Token
 * -------------------
 * Returns an almost-immediately expiring token for logout flows.
 */
export function expireToken(): string {
  return generateToken({ uuid: '0', role: 'none', type: 'employee' }, '1ms');
}
