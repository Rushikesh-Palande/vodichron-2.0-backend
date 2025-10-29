import { Router } from 'express';
import { logger } from '../../../utils/logger';
import { authLogin } from '../controllers/login.controller';
import { logoutUser } from '../controllers/logout.controller';
import { extendSession } from '../controllers/extend-session.controller';

/**
 * Authentication Routes for Vodichron HRMS
 * =======================================
 * Production-level authentication routes with comprehensive logging and docs.
 * Note: Global rate limiting is already applied in app.ts for /api/*.
 */
const router = Router();

// Log route registration start
logger.info('🔐 Initializing authentication routes...');

/**
 * POST /login
 * -----------
 * Authenticates credentials and returns a short-lived access token
 * plus a refresh session cookie.
 */
router.post('/login', authLogin);
logger.info('✅ Auth route registered: POST /auth/login');

/**
 * POST /logout
 * ------------
 * Revokes current refresh session, clears cookie, and returns null token.
 */
router.post('/logout', logoutUser);
logger.info('✅ Auth route registered: POST /auth/logout');

/**
 * POST /extend-session
 * --------------------
 * Rotates refresh token and issues a new access token.
 */
router.post('/extend-session', extendSession);
logger.info('✅ Auth route registered: POST /auth/extend-session');

/**
 * GET /status
 * -----------
 * Returns authentication system status and enabled features.
 */
router.get('/status', (_req, res) => {
  logger.info('🔐 Authentication system status requested');
  res.status(200).json({
    success: true,
    message: 'Authentication system status retrieved',
    data: {
      status: 'active',
      endpoints: {
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        extendSession: '/api/auth/extend-session',
        status: '/api/auth/status',
      },
      features: {
        rateLimiting: true,
        passwordHashing: true,
        jwtTokens: true,
        refreshTokens: true,
        sessionManagement: true,
      },
      limits: {
        accessTokenExpiry: '30 minutes',
        refreshTokenExpiry: '7 days',
      },
      timestamp: new Date().toISOString(),
    },
  });
});
logger.info('✅ Auth status route registered: GET /auth/status');

export default router;
