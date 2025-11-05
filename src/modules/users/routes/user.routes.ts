/**
 * User Routes
 * ===========
 * Express routes for user-related endpoints.
 * Follows auth module pattern.
 */

import { Router } from 'express';
import { logger } from '../../../utils/logger';
import { getUserProfileExpressController } from '../controllers/profile.controller';
import { registerUserExpressController } from '../controllers/register-user.controller';
import { getApplicationUsersListExpressController } from '../controllers/user-list.controller';
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

/**
 * POST /register
 * ==============
 * Register a new application user (grant access to employee).
 * Requires JWT authentication.
 * Only Admin/HR/SuperUser roles can register users.
 * Based on old backend: POST /user/register
 */
router.post('/register', authenticateJWT, registerUserExpressController);
logger.info('✅ User route registered: POST /user/register');

/**
 * POST /list
 * ==========
 * Get paginated list of application users with optional filters.
 * Requires JWT authentication.
 * All authenticated users can view, but role-based access control applies:
 * - Super users can see all users including other super users
 * - Non-super users cannot see super users in results
 * Based on old backend: POST /user/list
 */
router.post('/list', authenticateJWT, getApplicationUsersListExpressController);
logger.info('✅ User route registered: POST /user/list');

export default router;
