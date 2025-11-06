/**
 * Update User Service
 * ====================
 * Business logic for updating user data (PATCH).
 * 
 * Based on old backend: userController.patch (lines 129-163)
 * 
 * Endpoint: PATCH /user
 * Authorization:
 * - Employees can only update themselves
 * - Only SuperUsers can assign SuperUser role
 * - Admin/HR/SuperUser can update any user
 */

import { Request, Response } from 'express';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { updateUserInputSchema, ApplicationUserRole } from '../../schemas/crud/update-user.schemas';
import { getUserCredsByEmployeeId, updateApplicationUserData } from '../../store/crud/user-crud.store';
import { hashPassword } from '../../../auth/helpers/hash-password.helper';

/**
 * Handle Update User
 * ==================
 * Updates user role, password, and status.
 * 
 * Old backend logic (userController.ts:129-163):
 * 1. Extract uuid, employeeId, password, role, status from body
 * 2. Get existing user by employeeId
 * 3. Authorization: Employees can only update themselves (lines 134-136)
 * 4. Check user exists (lines 138-141)
 * 5. Validate with userFormValidateInUpdateFlow
 * 6. Hash password if provided (optional field) (lines 144-147)
 * 7. SuperUser check: Only super users can assign super user role (lines 148-150)
 * 8. Update user data with updateApplicationUserData
 * 9. Return success message
 */
export async function handleUpdateUser(req: Request, res: Response) {
  const timer = new PerformanceTimer('updateUser_service');
  const user = (req as any).user;

  try {
    logger.info('✏️ Updating user', {
      requestedBy: user?.uuid,
      operation: 'updateUser'
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

    // Step 2: Validate input with Zod schema
    const parseResult = updateUserInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));

      logger.warn('⚠️ Update user validation failed', {
        errors,
        requestedBy: user.uuid
      });

      return res.status(400).json({
        success: false,
        message: `Validation failed for fields: ${errors.map((e: any) => e.field).join(', ')}`,
        errors,
        timestamp: new Date().toISOString()
      });
    }

    const userData = parseResult.data;

    // Step 3: Get existing user
    logger.debug('🔍 Fetching existing user', { employeeId: userData.employeeId });

    let existingUser;
    try {
      existingUser = await getUserCredsByEmployeeId(userData.employeeId);
    } catch {
      logger.warn('⚠️ User not found for update', {
        employeeId: userData.employeeId,
        requestedBy: user.uuid
      });

      return res.status(400).json({
        success: false,
        message: 'Unable to find the details of the employee to update.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 4: Authorization check - Employees can only update themselves
    // (Old backend lines 134-136)
    if (loggedInUserRole === ApplicationUserRole.employee && user.uuid !== existingUser.employeeId) {
      logger.warn('🚫 Unauthorized update attempt', {
        requestedBy: user.uuid,
        targetUser: existingUser.employeeId,
        userRole: loggedInUserRole
      });

      logSecurity('UPDATE_USER_UNAUTHORIZED', 'high', {
        userRole: loggedInUserRole,
        reason: 'Employee trying to update another user'
      }, undefined, user.uuid);

      return res.status(403).json({
        success: false,
        message: 'Access denied for the operation request.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 5: Handle password - keep existing if not provided
    // (Old backend lines 144-147)
    let encryptedPassword = existingUser.password;
    if (userData.password) {
      logger.debug('🔒 Hashing new password', { employeeId: userData.employeeId });
      encryptedPassword = await hashPassword(userData.password);
    }

    // Step 6: SuperUser authorization check
    // (Old backend lines 148-150)
    if (userData.role === ApplicationUserRole.superUser && loggedInUserRole !== ApplicationUserRole.superUser) {
      logger.warn('🚫 Unauthorized attempt to assign SuperUser role', {
        requestedBy: user.uuid,
        requestedByRole: loggedInUserRole,
        targetUser: userData.employeeId
      });

      logSecurity('UPDATE_USER_SUPER_USER_UNAUTHORIZED', 'critical', {
        userRole: loggedInUserRole,
        reason: 'Only Super users can add other Super users'
      }, undefined, user.uuid);

      return res.status(403).json({
        success: false,
        message: 'Only Super users can add other Super users.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 7: Update user in database
    logger.info('✏️ Updating user in database', {
      employeeId: userData.employeeId,
      role: userData.role,
      hasNewPassword: !!userData.password,
      hasStatus: !!userData.status,
      requestedBy: user.uuid
    });

    const updateData = {
      employeeId: userData.employeeId,
      password: encryptedPassword,
      role: userData.role,
      status: userData.status
    };

    await updateApplicationUserData(updateData, user.uuid);

    const duration = timer.end();

    logger.info('✅ User updated successfully', {
      employeeId: userData.employeeId,
      role: userData.role,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('UPDATE_USER_SUCCESS', 'medium', {
      employeeId: userData.employeeId,
      role: userData.role,
      updatedBy: user.uuid,
      updatedByRole: user.role,
      duration
    }, undefined, user.uuid);

    // Old backend returns plain text message
    return res.status(200).send('User details saved successfully');

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to update user', {
      requestedBy: user?.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('UPDATE_USER_ERROR', 'critical', {
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
