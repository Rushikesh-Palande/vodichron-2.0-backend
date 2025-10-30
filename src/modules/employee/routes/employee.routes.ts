import { Router } from 'express';
import { logger } from '../../../utils/logger';
import { authenticateJWT } from '../../../middleware/auth.middleware';
import { getEmployeeByIdExpressController } from '../controllers/crud/get-by-id.controller';
import { getEmployeesListExpressController } from '../controllers/crud/list.controller';
import { createEmployeeExpressController } from '../controllers/crud/create.controller';
import { checkEmployeeExistExpressController } from '../controllers/crud/check-employee-exist.controller';
import { updateEmployeeExpressController } from '../controllers/crud/update.controller';
import { searchManagerAssignmentExpressController } from '../controllers/search/search-manager-assignment.controller';

/**
 * Employee Routes for Vodichron HRMS
 * ==================================
 * RESTful API routes for employee management operations.
 * 
 * Note: This is for Express REST API routes.
 * tRPC routes are defined separately in trpc/routers/
 * 
 * Based on old vodichron employeeRoutes.ts
 */
const router = Router();

// Log route registration start
logger.info('👥 Initializing employee routes...');

/**
 * GET /status
 * -----------
 * Returns employee system status and enabled features
 * IMPORTANT: This route must be defined BEFORE /:id to avoid conflicts
 */
router.get('/status', (_req, res) => {
  logger.info('👥 Employee system status requested');
  res.status(200).json({
    success: true,
    message: 'Employee system status retrieved',
    data: {
      status: 'active',
      endpoints: {
        getById: '/api/employees/:id',
        list: '/api/employees/list',
        create: '/api/employees/register',
        exists: '/api/employees/exists',
        update: '/api/employees/update',
        searchManagerAssignment: '/api/employees/search/manager-assignment/:keyword',
        delete: '/api/employees/:id',
        search: '/api/employees/search/:keyword',
        status: '/api/employees/status',
      },
      features: {
        profileManagement: true,
        emailValidation: true,
        managerSearch: true, // ✅ Implemented
        documentUpload: false, // TODO: Implement
        photoUpload: false, // TODO: Implement
        searchFunctionality: false, // TODO: Implement (general search)
        roleBasedAccess: true,
      },
      implemented: {
        getById: true, // Available via both REST and tRPC
        list: true, // Available via both REST and tRPC
        create: true, // Available via both REST and tRPC
        checkExists: true, // Available via both REST and tRPC
        update: true, // Available via both REST and tRPC
        searchManagerAssignment: true, // ✅ Available via both REST and tRPC
        delete: false,
        search: false, // General search not implemented yet
      },
      timestamp: new Date().toISOString(),
    },
  });
});
logger.info('✅ Employee status route registered: GET /employees/status');

/**
 * GET /:id
 * --------
 * Fetches employee profile by UUID with authorization checks
 * 
 * Authorization:
 * - ALL_USERS (with role-based filtering in controller)
 * 
 * Old route: GET /employee/:id
 */
router.get('/:id', authenticateJWT, getEmployeeByIdExpressController);
logger.info('✅ Employee route registered: GET /employees/:id');

/**
 * POST /list
 * ----------
 * Get paginated list of employees
 * 
 * Authorization:
 * - ADMIN_USERS, directors, managers
 * 
 * Old route: POST /employee/list
 */
router.post('/list', authenticateJWT, getEmployeesListExpressController);
logger.info('✅ Employee route registered: POST /employees/list');

/**
 * POST /register
 * --------------
 * Create new employee profile
 * 
 * Authorization:
 * - ADMIN_USERS only (super_user, admin, hr)
 * 
 * Old route: POST /employee/register
 */
router.post('/register', authenticateJWT, createEmployeeExpressController);
logger.info('✅ Employee route registered: POST /employees/register');

/**
 * POST /exists
 * ------------
 * Check if employee email already exists
 * 
 * Authorization:
 * - ALL_USERS (public endpoint for form validation)
 * 
 * Old route: POST /employee/exists
 */
router.post('/exists', checkEmployeeExistExpressController);
logger.info('✅ Employee route registered: POST /employees/exists');

/**
 * PATCH /update
 * -------------
 * Update employee profile
 * 
 * Authorization:
 * - ORG_USERS (self + admins/HR)
 * - HR/Super users can update any employee and all fields
 * - Regular employees can only update their own profile (restricted fields)
 * 
 * Old route: PATCH /employee/update
 */
router.patch('/update', authenticateJWT, updateEmployeeExpressController);
logger.info('✅ Employee route registered: PATCH /employees/update');

/**
 * GET /search/manager-assignment/:keyword
 * ---------------------------------------
 * Search employees for manager/director assignment
 * Used in employee registration/update forms for selecting reporting manager/director
 * 
 * Authorization:
 * - ADMIN_USERS (super_user, admin, hr)
 * 
 * Query Parameters:
 * - exclude: Comma-separated list of user UUIDs to exclude (optional)
 * 
 * Old route: GET /employee/search/manager-assignment/list/:keyword
 */
router.get(
  '/search/manager-assignment/:keyword',
  authenticateJWT,
  searchManagerAssignmentExpressController
);
logger.info('✅ Employee route registered: GET /employees/search/manager-assignment/:keyword');

/**
 * DELETE /:id
 * -----------
 * Delete employee profile
 * 
 * Authorization:
 * - SUPER_USERS only
 * 
 * Old route: DELETE /employee/:id
 */
// TODO: Implement when needed

/**
 * GET /search/:keyword
 * -------------------
 * Search employees by keyword (general search)
 * 
 * Authorization:
 * - ADMIN_USERS
 * 
 * Old route: GET /employee/search/list/:keyword
 */
// TODO: Implement when needed


// TODO: Add more routes here as controllers are implemented
// Following the pattern from old vodichron:
// - POST /exists - Check if employee email exists
// - GET /search/role-assignment/list/:keyword
// - GET /search/manager-assignment/list/:keyword
// - GET /search/leave-approver/list/:keyword
// - POST /photo/upload
// - GET /image/:id
// - DELETE /image/:id
// - POST /document/upload
// - GET /documents/:id
// - POST /all/documents
// - DELETE /document/:empid/:docid
// - GET /document/download/:empid/:docid
// - PATCH /document/approve/:docid

export default router;
