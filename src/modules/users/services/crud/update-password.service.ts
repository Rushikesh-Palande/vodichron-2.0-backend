/**
 * Update Password Service
 * ========================
 * Business logic for updating user password.
 * 
 * Based on old backend: userController.updatePassword (lines 112-127)
 * 
 * Endpoint: POST /user/update-password
 * Authorization: User can only update their own password
 * Validates old password before setting new one
 */

import { Request, Response } from 'express';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { updatePasswordInputSchema } from '../../schemas/crud/update-password.schemas';
import { getUserCredsByEmployeeId, updateUserPassword } from '../../store/crud/user-crud.store';
import { hashPassword } from '../../../auth/helpers/hash-password.helper';
import { comparePasswords } from '../../../auth/helpers/compare-passwords';

/**
 * Handle Update Password
 * =======================
 * Updates user password after validating old password.
 * 
 * Old backend logic (userController.ts:112-127):
 * 1. Extract id, oldPassword, newPassword from body
 * 2. Validate user with old password (validateUserByEmployeeId)
 * 3. Validate new password format with PasswordRegex
 * 4. Hash new password
 * 5. Update password with updateUserPassword
 * 6. Return success message
 */
export async function handleUpdatePassword(req: Request, res: Response) {
  const timer = new PerformanceTimer('updatePassword_service');
  const user = (req as any).user;

  try {
    logger.info('🔒 Updating user password', {
      requestedBy: user?.uuid,
      operation: 'updatePassword'
    });

    // Step 1: Validate authentication
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No authentication provided',
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Validate input with Zod schema
    const parseResult = updatePasswordInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));

      logger.warn('⚠️ Update password validation failed', {
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

    const { id: employeeId, oldPassword, newPassword } = parseResult.data;

    // Step 3: Get user credentials
    logger.debug('🔍 Fetching user credentials', { employeeId });

    let userCreds;
    try {
      userCreds = await getUserCredsByEmployeeId(employeeId);
    } catch {
      logger.warn('⚠️ User not found for password update', {
        employeeId,
        requestedBy: user.uuid
      });

      return res.status(404).json({
        success: false,
        message: 'Unable to find the user',
        timestamp: new Date().toISOString()
      });
    }

    // Step 4: Validate old password
    logger.debug('🔐 Validating old password', { employeeId });

    const isOldPasswordValid = await comparePasswords(oldPassword, userCreds.password);

    if (!isOldPasswordValid) {
      logger.warn('⚠️ Invalid old password provided', {
        employeeId,
        requestedBy: user.uuid
      });

      logSecurity('UPDATE_PASSWORD_INVALID_OLD_PASSWORD', 'medium', {
        employeeId,
        reason: 'Incorrect current password'
      }, undefined, user.uuid);

      return res.status(400).json({
        success: false,
        message: 'Unable to verify the user details. Check current password.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 5: Hash new password
    logger.debug('🔒 Hashing new password', { employeeId });

    const hashedPassword = await hashPassword(newPassword);

    // Step 6: Update password in database
    logger.info('✏️ Updating password in database', {
      employeeId,
      requestedBy: user.uuid
    });

    await updateUserPassword(employeeId, hashedPassword);

    const duration = timer.end();

    logger.info('✅ Password updated successfully', {
      employeeId,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('UPDATE_PASSWORD_SUCCESS', 'medium', {
      employeeId,
      updatedBy: user.uuid,
      duration
    }, undefined, user.uuid);

    // Old backend returns plain text message
    return res.status(200).send('Password updated successfully');

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to update password', {
      requestedBy: user?.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('UPDATE_PASSWORD_ERROR', 'critical', {
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
