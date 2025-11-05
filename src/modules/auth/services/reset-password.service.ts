/**
 * Reset Password Service
 * ======================
 * Business logic for resetting user passwords.
 * 
 * Flow:
 * 1. Validate reset token
 * 2. Verify user exists and account is active
 * 3. Hash new password
 * 4. Update password in database
 * 5. Delete used reset token
 * 
 * Security:
 * - Validates token before password update
 * - Ensures account is active
 * - Hashes password with bcrypt
 * - Single-use tokens (deleted after use)
 * - Comprehensive audit logging
 */

import { logger, logAuth, logSecurity } from '../../../utils/logger';
import { findEmployeeByOfficialEmail, findCustomerByEmail, findUserByEmployeeUuid, findCustomerAccessByCustomerId } from '../store/auth.store';
import { findPasswordResetByToken, deletePasswordResetRequest, updateUserPasswordByEmail, updateCustomerPasswordByEmail } from '../store/password-reset.store';
import { hashPassword } from '../helpers/hash-password.helper';

/**
 * Reset Password Service
 * ---------------------
 * Resets user password using validated reset token.
 * 
 * @param email - User's email address
 * @param token - Encrypted reset token
 * @param newPassword - New password (plain text, will be hashed)
 * @param clientIp - IP address of the requester (for logging)
 * @returns Promise<boolean> - True if successful
 * @throws Error if validation fails or account inactive
 */
export async function resetPasswordService(
  email: string,
  token: string,
  newPassword: string,
  clientIp?: string
) {
  logger.info('🔐 Step 1: Password reset initiated', {
    email,
    ip: clientIp,
    type: 'PASSWORD_RESET'
  });

  try {
    // Step 1: Validate reset token
    logger.debug('🔍 Step 2: Validating reset token');
    const resetRequest = await findPasswordResetByToken(token);

    if (!resetRequest) {
      logger.warn('⚠️ Step 2.1: Invalid or expired reset token', {
        email,
        type: 'PASSWORD_RESET_INVALID_TOKEN'
      });
      logSecurity('PASSWORD_RESET_INVALID_TOKEN', 'medium', { 
        email,
        reason: 'Token not found or expired' 
      }, clientIp);
      
      throw new Error('Looks like your reset link is expired.');
    }

    // Verify email matches token
    if (resetRequest.email !== email) {
      logger.warn('⚠️ Step 2.2: Email mismatch with token', {
        tokenEmail: resetRequest.email,
        providedEmail: email,
        type: 'PASSWORD_RESET_EMAIL_MISMATCH'
      });
      logSecurity('PASSWORD_RESET_EMAIL_MISMATCH', 'high', { 
        tokenEmail: resetRequest.email,
        providedEmail: email 
      }, clientIp);
      
      throw new Error('Invalid reset request.');
    }

    logger.info('✅ Step 2.3: Reset token validated successfully');

    // Step 2: Determine user type and verify account
    logger.debug('🔍 Step 3: Checking user type and account status');
    
    const employee = await findEmployeeByOfficialEmail(email);
    const customer = !employee ? await findCustomerByEmail(email) : null;

    if (!employee && !customer) {
      logger.warn('⚠️ Step 3.1: User not found', {
        email,
        type: 'PASSWORD_RESET_USER_NOT_FOUND'
      });
      logSecurity('PASSWORD_RESET_USER_NOT_FOUND', 'medium', { email }, clientIp);
      
      throw new Error('User not found.');
    }

    const userType = employee ? 'employee' : 'customer';
    logger.info(`✅ Step 3.2: User found (${userType})`, { email, userType });

    // Step 3: Verify account status
    let userId: string | undefined;
    let userRole: string | undefined;

    if (employee) {
      const user = await findUserByEmployeeUuid(employee.uuid);
      if (!user || user.status !== 'ACTIVE') {
        logger.warn('⚠️ Step 3.3: Account inactive', {
          email,
          status: user?.status || 'NO_USER_RECORD',
          type: 'PASSWORD_RESET_INACTIVE_ACCOUNT'
        });
        logAuth('PASSWORD_RESET', employee.uuid, email, clientIp, false, user?.role, 'Account inactive');
        logSecurity('PASSWORD_RESET_INACTIVE_ACCOUNT', 'medium', { email, status: user?.status }, clientIp);
        
        throw new Error('Your account is in deactivated state, contact HR to activate the account.');
      }
      userId = employee.uuid;
      userRole = user.role;
    } else if (customer) {
      const access = await findCustomerAccessByCustomerId(customer.uuid);
      if (!access || access.status !== 'ACTIVE') {
        logger.warn('⚠️ Step 3.3: Customer account inactive', {
          email,
          status: access?.status || 'NO_ACCESS_RECORD',
          type: 'PASSWORD_RESET_INACTIVE_ACCOUNT'
        });
        logAuth('PASSWORD_RESET', customer.uuid, email, clientIp, false, 'customer', 'Account inactive');
        logSecurity('PASSWORD_RESET_INACTIVE_ACCOUNT', 'medium', { email, userType: 'customer' }, clientIp);
        
        throw new Error('Your account is in deactivated state, contact HR to activate the account.');
      }
      userId = customer.uuid;
      userRole = 'customer';
    }

    logger.info('✅ Step 3.4: Account status verified (ACTIVE)');

    // Step 4: Hash new password
    logger.debug('🔒 Step 4: Hashing new password');
    const hashedPassword = await hashPassword(newPassword);
    logger.info('✅ Step 4.1: Password hashed successfully');

    // Step 5: Update password in database
    logger.debug('💾 Step 5: Updating password in database');
    
    let rowsAffected = 0;
    if (userType === 'employee') {
      rowsAffected = await updateUserPasswordByEmail(email, hashedPassword);
    } else {
      rowsAffected = await updateCustomerPasswordByEmail(email, hashedPassword);
    }

    if (rowsAffected === 0) {
      logger.error('❌ Step 5.1: Failed to update password', {
        email,
        userType,
        type: 'PASSWORD_RESET_UPDATE_FAILED'
      });
      throw new Error('Failed to update password.');
    }

    logger.info('✅ Step 5.2: Password updated successfully', {
      email,
      userType,
      rowsAffected
    });

    // Step 6: Delete used reset token
    logger.debug('🗑️ Step 6: Deleting used reset token');
    await deletePasswordResetRequest(email);
    logger.info('✅ Step 6.1: Reset token deleted (single-use enforced)');

    // Log successful password reset
    logAuth('PASSWORD_RESET', userId, email, clientIp, true, userRole);
    logSecurity('PASSWORD_RESET_SUCCESS', 'low', { email, userType }, clientIp, userId);

    logger.info('✅ Password reset completed successfully', {
      email,
      userType,
      userId
    });

    return true;

  } catch (error: any) {
    logger.error('❌ Password reset failed', {
      email,
      error: error.message,
      type: 'PASSWORD_RESET_ERROR',
      stack: error.stack
    });

    logSecurity('PASSWORD_RESET_FAILED', 'medium', { 
      error: error.message,
      email 
    }, clientIp);

    // Re-throw error for controller to handle
    throw error;
  }
}
