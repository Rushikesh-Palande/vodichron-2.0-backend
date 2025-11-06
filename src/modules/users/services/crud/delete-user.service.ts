/**
 * Delete User Service
 * ====================
 * Business logic for deleting user account.
 * 
 * Based on old backend: userController.deleteUser (lines 74-83)
 * 
 * Endpoint: DELETE /user/:id
 * Authorization: Admin/HR/SuperUser only
 * Deletes user application access by employeeId
 */

import { Request, Response } from 'express';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { deleteUserParamsSchema } from '../../schemas/crud/delete-user.schemas';
import { getUserCredsByEmployeeId, deleteAppUserData } from '../../store/crud/user-crud.store';

/**
 * Admin User Roles
 * ================
 * Roles authorized to delete users
 */
const ADMIN_USERS = ['super_user', 'hr', 'admin'];

/**
 * Handle Delete User
 * ==================
 * Deletes user application access by employeeId.
 * 
 * Old backend logic (userController.ts:74-83):
 * 1. Get user by employeeId from params
 * 2. Throw NotFoundError if user not found
 * 3. Delete user with deleteAppUserData
 * 4. Return 200 status
 */
export async function handleDeleteUser(req: Request, res: Response) {
  const timer = new PerformanceTimer('deleteUser_service');
  const user = (req as any).user;

  try {
    logger.info('🗑️ Deleting user', {
      requestedBy: user?.uuid,
      operation: 'deleteUser'
    });

    // Step 1: Validate authentication
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No authentication provided',
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Authorization check - Only Admin/HR/SuperUser can delete
    if (!ADMIN_USERS.includes(user.role)) {
      logger.warn('🚫 Unauthorized delete attempt', {
        requestedBy: user.uuid,
        userRole: user.role
      });

      logSecurity('DELETE_USER_UNAUTHORIZED', 'high', {
        userRole: user.role,
        reason: 'Only Admin/HR/SuperUser can delete users'
      }, undefined, user.uuid);

      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin/HR/SuperUser can delete users.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 3: Validate params with Zod schema
    const parseResult = deleteUserParamsSchema.safeParse(req.params);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));

      logger.warn('⚠️ Delete user validation failed', {
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

    // Step 4: Check if user exists
    logger.debug('🔍 Checking if user exists', { employeeId });

    try {
      await getUserCredsByEmployeeId(employeeId);
    } catch {
      logger.warn('⚠️ User not found for deletion', {
        employeeId,
        requestedBy: user.uuid
      });

      return res.status(404).json({
        success: false,
        message: 'Unable to find the user to delete',
        timestamp: new Date().toISOString()
      });
    }

    // Step 5: Delete user
    logger.info('🗑️ Deleting user from database', {
      employeeId,
      requestedBy: user.uuid
    });

    const deletedCount = await deleteAppUserData(employeeId);

    const duration = timer.end();

    logger.info('✅ User deleted successfully', {
      employeeId,
      deletedCount,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('DELETE_USER_SUCCESS', 'medium', {
      employeeId,
      deletedBy: user.uuid,
      deletedByRole: user.role,
      duration
    }, undefined, user.uuid);

    // Old backend returns 200 with no body
    return res.status(200).send();

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to delete user', {
      requestedBy: user?.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('DELETE_USER_ERROR', 'critical', {
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
