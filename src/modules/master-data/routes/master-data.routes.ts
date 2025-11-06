import { Router } from 'express';
import { logger } from '../../../utils/logger';
import { authenticateJWT } from '../../../middleware/auth.middleware';
import { getMasterDataExpressController } from '../controllers/get-master-data.controller';

/**
 * Master Data Routes for Vodichron HRMS
 * =====================================
 * RESTful API routes for master data configuration operations.
 * 
 * Note: This is for Express REST API routes.
 * tRPC routes are defined separately in trpc/routers/
 * 
 * Based on old vodichron /common-data/master
 */
const router = Router();

// Log route registration start
logger.info('⚙️ Initializing master data routes...');

/**
 * GET /
 * -----
 * Fetches all master data configuration
 * Returns designation, department, leave types, and other system configuration
 * 
 * Authorization:
 * - ADMIN_USERS and EMP_MANAGERS (super_user, admin, hr, director, manager)
 * 
 * Old route: GET /common-data/master
 */
router.get('/', authenticateJWT, getMasterDataExpressController);
logger.info('✅ Master data route registered: GET /master-data');

/**
 * PATCH /save
 * -----------
 * Updates master data configuration (batch update)
 * 
 * Authorization:
 * - ADMIN_USERS only (super_user, admin, hr)
 * - Managers/Directors can READ but NOT UPDATE
 * 
 * Request Body:
 * {
 *   masterFields: Array<{
 *     name: string;     // Field name (e.g., 'designation')
 *     value: string[];  // New values array
 *   }>
 * }
 * 
 * Old route: PATCH /common-data/master/save
 */
import { updateMasterDataExpressController } from '../controllers/update-master-data.controller';

router.patch('/save', authenticateJWT, updateMasterDataExpressController);
logger.info('✅ Master data route registered: PATCH /master-data/save');

export default router;
