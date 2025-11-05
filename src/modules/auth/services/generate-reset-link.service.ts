/**
 * Generate Reset Link Service
 * ===========================
 * Business logic for generating password reset links.
 * 
 * Flow:
 * 1. Validate user exists (employee or customer)
 * 2. Check account status (must be ACTIVE)
 * 3. Generate random token and encrypt it
 * 4. Store encrypted token in database
 * 5. Generate reset URL with token
 * 6. Send email with reset link
 * 
 * Security:
 * - Returns success even if user not found (prevents email enumeration)
 * - Tokens are encrypted before storage
 * - 15-minute expiration window
 * - Email link includes obfuscation parameter
 */

import { config } from '../../../config';
import { logger, logAuth, logSecurity } from '../../../utils/logger';
import { findEmployeeByOfficialEmail, findCustomerByEmail, findUserByEmployeeUuid, findCustomerAccessByCustomerId } from '../store/auth.store';
import { createPasswordResetRequest } from '../store/password-reset.store';
import { encrypt } from '../../employee/helpers/encrypt.helper';
import { generateRandomString } from '../helpers/generate-random-string.helper';
import path from 'path';
import { sendEmail } from '../../../services/email.service';
import { getResetPasswordEmailTemplate } from '../templates/reset-password-email.template';

/**
 * Generate Password Reset Link
 * ----------------------------
 * Generates and sends password reset link to user's email.
 * 
 * @param username - Email address of the user
 * @param clientIp - IP address of the requester (for logging)
 * @returns Promise<boolean> - Always returns true (prevents email enumeration)
 */
export async function generateResetLinkService(username: string, clientIp?: string) {
  logger.info('🔐 Step 1: Password reset link generation initiated', {
    username,
    ip: clientIp,
    type: 'PASSWORD_RESET_GENERATE'
  });

  try {
    // Step 1: Determine if user is employee or customer
    logger.debug('🔍 Step 2: Checking user type (employee/customer)');
    
    const employee = await findEmployeeByOfficialEmail(username);
    const customer = !employee ? await findCustomerByEmail(username) : null;

    // Step 2: Check if user exists
    if (!employee && !customer) {
      logger.warn('⚠️ Step 2.1: User not found for email', {
        username,
        type: 'PASSWORD_RESET_USER_NOT_FOUND'
      });
      logAuth('PASSWORD_RESET_REQUEST', undefined, username, clientIp, false, undefined, 'User not found');
      logSecurity('PASSWORD_RESET_INVALID_EMAIL', 'low', { username }, clientIp);
      
      // Return success to prevent email enumeration
      return true;
    }

    const userType = employee ? 'employee' : 'customer';
    logger.info(`✅ Step 2.2: User found (${userType})`, { username, userType });

    // Step 3: Verify account status
    if (employee) {
      const user = await findUserByEmployeeUuid(employee.uuid);
      if (!user || user.status !== 'ACTIVE') {
        logger.warn('⚠️ Step 3: Account inactive or missing', {
          username,
          status: user?.status || 'NO_USER_RECORD',
          type: 'PASSWORD_RESET_INACTIVE_ACCOUNT'
        });
        logAuth('PASSWORD_RESET_REQUEST', employee.uuid, username, clientIp, false, user?.role, 'Account inactive');
        logSecurity('PASSWORD_RESET_INACTIVE_ACCOUNT', 'medium', { username, status: user?.status }, clientIp);
        
        throw new Error('Your account is in deactivated state, contact HR to activate the account.');
      }
    } else if (customer) {
      const access = await findCustomerAccessByCustomerId(customer.uuid);
      if (!access || access.status !== 'ACTIVE') {
        logger.warn('⚠️ Step 3: Customer account inactive', {
          username,
          status: access?.status || 'NO_ACCESS_RECORD',
          type: 'PASSWORD_RESET_INACTIVE_ACCOUNT'
        });
        logAuth('PASSWORD_RESET_REQUEST', customer.uuid, username, clientIp, false, 'customer', 'Account inactive');
        logSecurity('PASSWORD_RESET_INACTIVE_ACCOUNT', 'medium', { username, userType: 'customer' }, clientIp);
        
        throw new Error('Your account is in deactivated state, contact HR to activate the account.');
      }
    }

    logger.info('✅ Step 3.1: Account status verified (ACTIVE)');

    // Step 4: Generate random token and encrypt it
    logger.debug('🔑 Step 4: Generating reset token');
    const randomToken = generateRandomString(6); // 6-character token
    const encryptedToken = await encrypt(randomToken);

    if (!encryptedToken) {
      logger.error('❌ Step 4.1: Failed to encrypt token', {
        type: 'PASSWORD_RESET_ENCRYPTION_ERROR'
      });
      throw new Error('Failed to generate reset token');
    }

    logger.info('✅ Step 4.1: Token generated and encrypted');

    // Step 5: Store reset request in database
    logger.debug('💾 Step 5: Storing reset request in database');
    await createPasswordResetRequest(username, encryptedToken);
    logger.info('✅ Step 5.1: Reset request stored successfully');

    // Step 6: Generate reset URL
    const frontendUrl = config.frontendUrl; // Get frontend URL from config
    const obfuscationKey = generateRandomString(10); // Random string for URL obfuscation
    // URL-encode the token to handle special characters like colon (:)
    const encodedToken = encodeURIComponent(encryptedToken);
    const resetUrl = `${frontendUrl}/reset-password/${obfuscationKey}/${encodedToken}`;
    
    logger.info('🔗 Step 6: Reset URL generated', {
      urlLength: resetUrl.length,
      expiresInMinutes: 15
    });

    // Step 7: Send email with logo
    logger.debug('📧 Step 7: Sending password reset email');
    const emailTemplate = getResetPasswordEmailTemplate({ passwordResetUrl: resetUrl });
    
    // Get absolute path to logo
    const logoPath = path.resolve(process.cwd(), config.asset.path, 'Vodichron-logo.png');
    
    await sendEmail({
      to: username,
      subject: emailTemplate.subject,
      html: emailTemplate.template,
      attachments: [
        {
          filename: 'vodichron-logo.png',
          path: logoPath,
          cid: 'vodichron-logo', // Content ID for embedding in HTML
        },
      ],
    });

    logger.info('✅ Step 7.1: Password reset email sent successfully', {
      username,
      type: 'PASSWORD_RESET_EMAIL_SENT'
    });

    // Log successful reset request
    const userId = employee?.uuid || customer?.uuid;
    const userRole = employee ? 'employee' : 'customer';
    logAuth('PASSWORD_RESET_REQUEST', userId, username, clientIp, true, userRole);
    logSecurity('PASSWORD_RESET_LINK_GENERATED', 'low', { username, userType }, clientIp, userId);

    logger.info('✅ Password reset link generation completed successfully', {
      username,
      userType,
      expiresInMinutes: 15
    });

    return true;

  } catch (error: any) {
    // Handle errors - still return true for security
    logger.error('❌ Password reset link generation failed', {
      username,
      error: error.message,
      type: 'PASSWORD_RESET_GENERATE_ERROR',
      stack: error.stack
    });

    logSecurity('PASSWORD_RESET_ERROR', 'medium', { 
      error: error.message, 
      username 
    }, clientIp);

    // Re-throw error if it's a user-facing message (account inactive)
    if (error.message.includes('deactivated state')) {
      throw error;
    }

    // For other errors, return success (prevents information leakage)
    return true;
  }
}
