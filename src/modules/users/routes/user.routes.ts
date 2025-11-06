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
import { checkUserExistsExpressController } from '../controllers/crud/check-user-exists.controller';
import { deleteUserExpressController } from '../controllers/crud/delete-user.controller';
import { updatePasswordExpressController } from '../controllers/crud/update-password.controller';
import { updateUserExpressController } from '../controllers/crud/update-user.controller';
import { getUserByIdExpressController } from '../controllers/crud/get-user-by-id.controller';
import { updateUserActivityExpressController } from '../controllers/activity/update-user-activity.controller';
import { createCustomerAppAccessExpressController } from '../controllers/customer/create-customer-access.controller';
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

/**
 * POST /check-exists
 * ==================
 * Check if user exists by email.
 * Requires JWT authentication.
 * Based on old backend: POST /user/check-exists
 */
router.post('/check-exists', authenticateJWT, checkUserExistsExpressController);
logger.info('✅ User route registered: POST /user/check-exists');

/**
 * DELETE /:id
 * ===========
 * Delete user by employeeId.
 * Requires JWT authentication.
 * Authorization: Admin/HR/SuperUser only
 * Based on old backend: DELETE /user/:id
 */
router.delete('/:id', authenticateJWT, deleteUserExpressController);
logger.info('✅ User route registered: DELETE /user/:id');

/**
 * POST /update-password
 * =====================
 * Update user password (validates old password).
 * Requires JWT authentication.
 * Authorization: User can only update their own password
 * Based on old backend: POST /user/update-password
 */
router.post('/update-password', authenticateJWT, updatePasswordExpressController);
logger.info('✅ User route registered: POST /user/update-password');

/**
 * PATCH /
 * =======
 * Update user (role, password, status).
 * Requires JWT authentication.
 * Authorization: Employees can only update themselves, only SuperUsers can assign SuperUser role
 * Based on old backend: PATCH /user
 */
router.patch('/', authenticateJWT, updateUserExpressController);
logger.info('✅ User route registered: PATCH /user');

/**
 * GET /:id
 * ========
 * Get user by employeeId (password blanked out).
 * Requires JWT authentication.
 * Authorization: Employees can only view themselves
 * Based on old backend: GET /user/:id
 */
router.get('/:id', authenticateJWT, getUserByIdExpressController);
logger.info('✅ User route registered: GET /user/:id');

/**
 * POST /activity
 * ==============
 * Update user activity tracking (e.g. FIRST_PASSWORD_CHANGE).
 * Requires JWT authentication.
 * Authorization: User can only update their own activities
 * Based on old backend: POST /user/activity
 */
router.post('/activity', authenticateJWT, updateUserActivityExpressController);
logger.info('✅ User route registered: POST /user/activity');

/**
 * POST /customer-access
 * =====================
 * Create customer app access with random password and send activation email.
 * Requires JWT authentication.
 * Authorization: Admin/HR/SuperUser only
 * Based on old backend: POST /user/customer-access
 */
router.post('/customer-access', authenticateJWT, createCustomerAppAccessExpressController);
logger.info('✅ User route registered: POST /user/customer-access');

export default router;
