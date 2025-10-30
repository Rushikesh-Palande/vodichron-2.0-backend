/**
 * User Routes
 * ===========
 * Express routes for user-related endpoints.
 * Follows auth module pattern.
 */

import { Router } from 'express';
import { logger } from '../../../utils/logger';
import { getUserProfileExpressController } from '../controllers/profile.controller';
import { authenticateJWT } from '../../../middleware/auth.middleware';

const router = Router();

logger.info('👤 Initializing user routes...');

/**
 * GET /profile
 * ============
 * Get the authenticated user's profile.
 * Requires JWT authentication.
 */
router.get('/profile', authenticateJWT, getUserProfileExpressController);
logger.info('✅ User route registered: GET /user/profile');

export default router;
