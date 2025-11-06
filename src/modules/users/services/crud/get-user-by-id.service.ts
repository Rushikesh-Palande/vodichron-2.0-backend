/**
 * Get User By ID Service
 * =======================
 * Business logic for getting user by employeeId.
 * 
 * Based on old backend: userController.get (lines 165-185)
 * 
 * Endpoint: GET /user/:id
 * Authorization: Employees can only view themselves
 * Returns: User data with password blanked out
 */

import { Request, Response } from 'express';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { getUserByIdParamsSchema } from '../../schemas/crud/get-user-by-id.schemas';
import { getUserCredsByEmployeeId } from '../../store/crud/user-crud.store';
import { ApplicationUserRole } from '../../schemas/crud/update-user.schemas';

/**
 * Handle Get User By ID
 * ======================
 * Fetches user by employeeId with password blanked.
 * 
 * Old backend logic (userController.ts:165-185):
 * 1. Get user by params.id (employeeId)
 * 2. Authorization: Employees can only view themselves (lines 170-172)
 * 3. Check user exists (lines 174-177)
 * 4. Return user with password blanked out (line 182)
 */
export async function handleGetUserById(req: Request, res: Response) {
  const timer = new PerformanceTimer('getUserById_service');
  const user = (req as any).user;

  try {
    logger.info('🔍 Fetching user by ID', {
      requestedBy: user?.uuid,
      operation: 'getUserById'
    });

    // Step 1: Validate authentication
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No authentication provided',
        timestamp: new Date().toISOString()
      });
    }

    const loggedInUserRole = user.role;

    // Step 2: Validate params with Zod schema
    const parseResult = getUserByIdParamsSchema.safeParse(req.params);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));

      logger.warn('⚠️ Get user by ID validation failed', {
        errors,
        requestedBy: user.uuid
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
        timestamp: new Date().toISOString()
      });
    }

    const { id: employeeId } = parseResult.data;

    // Step 3: Get user by employeeId
    logger.debug('🔍 Fetching user credentials', { employeeId });

    let userProfile;
    try {
      userProfile = await getUserCredsByEmployeeId(employeeId);
    } catch {
      logger.warn('⚠️ User not found', {
        employeeId,
        requestedBy: user.uuid
      });

      return res.status(400).json({
        success: false,
        message: 'Unable to find the details of the employee to update.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 4: Authorization check - Employees can only view themselves
    // (Old backend lines 170-172)
    if (loggedInUserRole === ApplicationUserRole.employee && user.uuid !== userProfile.uuid) {
      logger.warn('🚫 Unauthorized view attempt', {
        requestedBy: user.uuid,
        targetUser: userProfile.uuid,
        userRole: loggedInUserRole
      });

      logSecurity('GET_USER_BY_ID_UNAUTHORIZED', 'medium', {
        userRole: loggedInUserRole,
        reason: 'Employee trying to view another user'
      }, undefined, user.uuid);

      return res.status(403).json({
        success: false,
        message: 'Access denied for the operation request.',
        timestamp: new Date().toISOString()
      });
    }

    const duration = timer.end();

    logger.info('✅ User fetched successfully', {
      employeeId,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('GET_USER_BY_ID_SUCCESS', 'low', {
      employeeId,
      duration
    }, undefined, user.uuid);

    // Step 5: Return user with password blanked out
    // (Old backend lines 179-184)
    return res.status(200).json({
      data: {
        ...userProfile,
        password: ''
      }
    });

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to fetch user by ID', {
      requestedBy: user?.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('GET_USER_BY_ID_ERROR', 'medium', {
      error: error.message,
      duration
    }, undefined, user?.uuid);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}
