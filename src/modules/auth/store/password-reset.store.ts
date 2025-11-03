import PasswordReset from '../../../models/password-reset.model';
import User from '../../../models/user.model';
import CustomerAccess from '../../../models/customer-access.model';
import { 
  logger, 
  logDatabase,
  PerformanceTimer 
} from '../../../utils/logger';

/**
 * Password Reset Store (Data Access Layer)
 * ========================================
 * Handles all database operations for password reset functionality.
 * 
 * Key Responsibilities:
 * - Create password reset requests with encrypted tokens
 * - Validate reset tokens and check expiration
 * - Delete used/expired reset requests
 * - Update user passwords after successful reset
 * 
 * Security Principles:
 * - Tokens are encrypted before storage
 * - 15-minute expiration window for reset links
 * - Single-use tokens (deleted after use)
 * - Audit logging for all operations
 * 
 * Functions:
 * - createPasswordResetRequest: Store new reset request
 * - findPasswordResetByToken: Validate and retrieve reset request
 * - deletePasswordResetRequest: Remove used/expired tokens
 * - updateUserPasswordByEmail: Update employee password
 * - updateCustomerPasswordByEmail: Update customer password
 */

/**
 * Create Password Reset Request
 * -----------------------------
 * Creates a new password reset request record with encrypted token.
 * 
 * @param email - User's email address
 * @param encryptedToken - Encrypted reset token
 * @returns Promise<PasswordReset> - Created reset request record
 * 
 * Security:
 * - Token is encrypted before storage
 * - Email is indexed for fast lookup
 * - Timestamp tracked for expiration checks
 */
export async function createPasswordResetRequest(email: string, encryptedToken: string) {
  logger.info('📧 Step 1: Creating password reset request', { 
    email, 
    type: 'PASSWORD_RESET_STORE' 
  });
  
  const timer = new PerformanceTimer('DB: createPasswordResetRequest');
  
  try {
    // Delete any existing reset requests for this email
    await PasswordReset.destroy({ where: { email } });
    logger.debug('🗑️ Step 1.1: Deleted any existing reset requests for email', { email });
    
    // Create new reset request
    const resetRequest = await PasswordReset.create({
      email,
      token: encryptedToken,
      createdAt: new Date(),
    });
    
    const duration = timer.end({ email, uuid: resetRequest.uuid }, 300);
    logDatabase('INSERT', 'user_password_reset_request', duration, undefined, 1);
    
    logger.info('✅ Step 2: Password reset request created', { 
      email,
      uuid: resetRequest.uuid,
      createdAt: resetRequest.createdAt.toISOString()
    });
    
    return resetRequest;
    
  } catch (error: any) {
    const duration = timer.end({ email, error: error.message }, 300);
    logger.error('❌ createPasswordResetRequest failed', { 
      email, 
      error: error.message,
      type: 'PASSWORD_RESET_STORE_ERROR' 
    });
    logDatabase('INSERT', 'user_password_reset_request', duration, error);
    throw error;
  }
}

/**
 * Find Password Reset by Token
 * ----------------------------
 * Finds a password reset request by encrypted token.
 * Validates that the token exists and is not expired (15 min window).
 * 
 * @param encryptedToken - Encrypted reset token from URL
 * @returns Promise<PasswordReset | null> - Reset request or null if not found/expired
 * 
 * Expiration Logic:
 * - Tokens expire 15 minutes after creation
 * - Expired tokens are treated as invalid
 */
export async function findPasswordResetByToken(encryptedToken: string) {
  logger.debug('🔍 Step 1: Finding password reset request by token', { 
    type: 'PASSWORD_RESET_STORE' 
  });
  
  const timer = new PerformanceTimer('DB: findPasswordResetByToken');
  
  try {
    const resetRequest = await PasswordReset.findOne({ 
      where: { token: encryptedToken } 
    });
    
    const duration = timer.end({ found: !!resetRequest }, 500);
    logDatabase('SELECT', 'user_password_reset_request', duration, undefined, resetRequest ? 1 : 0);
    
    if (!resetRequest) {
      logger.debug('⚠️ Step 2: No reset request found for token', {
        type: 'PASSWORD_RESET_NOT_FOUND'
      });
      return null;
    }
    
    // Check if token is expired (15 minutes)
    const now = new Date();
    // Convert createdAt to Date object if it's a string
    const createdAtDate = resetRequest.createdAt instanceof Date 
      ? resetRequest.createdAt 
      : new Date(resetRequest.createdAt);
    const tokenAge = now.getTime() - createdAtDate.getTime();
    const fifteenMinutesInMs = 15 * 60 * 1000;
    
    if (tokenAge > fifteenMinutesInMs) {
      logger.warn('⏱️ Step 2.1: Reset token expired', {
        email: resetRequest.email,
        createdAt: createdAtDate.toISOString(),
        ageMinutes: Math.floor(tokenAge / 60000),
        type: 'PASSWORD_RESET_EXPIRED'
      });
      return null;
    }
    
    logger.info('✅ Step 2.2: Valid reset request found', { 
      email: resetRequest.email,
      uuid: resetRequest.uuid,
      ageMinutes: Math.floor(tokenAge / 60000)
    });
    
    return resetRequest;
    
  } catch (error: any) {
    const duration = timer.end({ error: error.message }, 500);
    logger.error('❌ findPasswordResetByToken failed', { 
      error: error.message,
      type: 'PASSWORD_RESET_STORE_ERROR' 
    });
    logDatabase('SELECT', 'user_password_reset_request', duration, error);
    throw error;
  }
}

/**
 * Delete Password Reset Request
 * -----------------------------
 * Removes a password reset request from database.
 * Called after successful password reset or to clean up expired tokens.
 * 
 * @param email - User's email address
 * @returns Promise<number> - Number of deleted records
 * 
 * Security:
 * - Ensures single-use tokens
 * - Cleans up sensitive data after use
 */
export async function deletePasswordResetRequest(email: string) {
  logger.info('🗑️ Step 1: Deleting password reset request', { 
    email, 
    type: 'PASSWORD_RESET_STORE' 
  });
  
  const timer = new PerformanceTimer('DB: deletePasswordResetRequest');
  
  try {
    const deletedCount = await PasswordReset.destroy({ where: { email } });
    
    const duration = timer.end({ email, deletedCount }, 300);
    logDatabase('DELETE', 'user_password_reset_request', duration, undefined, deletedCount);
    
    logger.info('✅ Step 2: Password reset request deleted', { 
      email,
      deletedCount
    });
    
    return deletedCount;
    
  } catch (error: any) {
    const duration = timer.end({ email, error: error.message }, 300);
    logger.error('❌ deletePasswordResetRequest failed', { 
      email, 
      error: error.message,
      type: 'PASSWORD_RESET_STORE_ERROR' 
    });
    logDatabase('DELETE', 'user_password_reset_request', duration, error);
    throw error;
  }
}

/**
 * Update User Password by Email
 * -----------------------------
 * Updates the password for an employee user account.
 * 
 * @param email - Employee's official email
 * @param hashedPassword - New password (already hashed with bcrypt)
 * @returns Promise<number> - Number of rows updated
 * 
 * Security:
 * - Password must be hashed before calling this function
 * - Updates only users linked to employees with matching email
 */
export async function updateUserPasswordByEmail(email: string, hashedPassword: string) {
  logger.info('🔒 Step 1: Updating user password', { 
    email, 
    type: 'PASSWORD_RESET_STORE' 
  });
  
  const timer = new PerformanceTimer('DB: updateUserPasswordByEmail');
  
  try {
    // First, find the user by joining with employee table
    const user = await User.findOne({
      include: [{
        model: require('../../../models/employee.model').default,
        as: 'employee',
        where: { officialEmailId: email }
      }]
    });
    
    if (!user) {
      logger.warn('⚠️ Step 1.1: No user found for email', { email });
      return 0;
    }
    
    // Update the password
    const result = await User.update(
      { password: hashedPassword }, 
      { where: { uuid: user.uuid } }
    );
    
    const rowsAffected = Array.isArray(result) ? result[0] : 0;
    const duration = timer.end({ email, rowsAffected }, 300);
    logDatabase('UPDATE', 'users', duration, undefined, rowsAffected);
    
    logger.info('✅ Step 2: User password updated successfully', { 
      email,
      userUuid: user.uuid,
      rowsAffected
    });
    
    return rowsAffected;
    
  } catch (error: any) {
    const duration = timer.end({ email, error: error.message }, 300);
    logger.error('❌ updateUserPasswordByEmail failed', { 
      email, 
      error: error.message,
      type: 'PASSWORD_RESET_STORE_ERROR' 
    });
    logDatabase('UPDATE', 'users', duration, error);
    throw error;
  }
}

/**
 * Update Customer Password by Email
 * ---------------------------------
 * Updates the password for a customer account.
 * 
 * @param email - Customer's email
 * @param hashedPassword - New password (already hashed with bcrypt)
 * @returns Promise<number> - Number of rows updated
 * 
 * Security:
 * - Password must be hashed before calling this function
 * - Updates CustomerAccess table linked to customer email
 */
export async function updateCustomerPasswordByEmail(email: string, hashedPassword: string) {
  logger.info('🔒 Step 1: Updating customer password', { 
    email, 
    type: 'PASSWORD_RESET_STORE' 
  });
  
  const timer = new PerformanceTimer('DB: updateCustomerPasswordByEmail');
  
  try {
    // First, find the customer by email
    const customer = await require('../../../models/customer.model').default.findOne({
      where: { email }
    });
    
    if (!customer) {
      logger.warn('⚠️ Step 1.1: No customer found for email', { email });
      return 0;
    }
    
    // Update the password in CustomerAccess table
    const result = await CustomerAccess.update(
      { password: hashedPassword }, 
      { where: { customerId: customer.uuid } }
    );
    
    const rowsAffected = Array.isArray(result) ? result[0] : 0;
    const duration = timer.end({ email, rowsAffected }, 300);
    logDatabase('UPDATE', 'customer_access', duration, undefined, rowsAffected);
    
    logger.info('✅ Step 2: Customer password updated successfully', { 
      email,
      customerId: customer.uuid,
      rowsAffected
    });
    
    return rowsAffected;
    
  } catch (error: any) {
    const duration = timer.end({ email, error: error.message }, 300);
    logger.error('❌ updateCustomerPasswordByEmail failed', { 
      email, 
      error: error.message,
      type: 'PASSWORD_RESET_STORE_ERROR' 
    });
    logDatabase('UPDATE', 'customer_access', duration, error);
    throw error;
  }
}
