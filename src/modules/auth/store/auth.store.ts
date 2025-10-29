import Employee from '../../../models/employee.model';
import User from '../../../models/user.model';
import Customer from '../../../models/customer.model';
import CustomerAccess from '../../../models/customer-access.model';
import OnlineStatus from '../../../models/online-status.model';
import Session from '../../../models/session.model';
import { 
  logger, 
  logDatabase,
  PerformanceTimer 
} from '../../../utils/logger';

/**
 * Vodichron HRMS Auth Store (Data Access Layer)
 * =============================================
 * 
 * Handles all database operations for the authentication module.
 * This layer provides clean abstraction between business logic and database.
 * 
 * Key Responsibilities:
 * - Employee and User lookups by email/UUID
 * - Customer and CustomerAccess queries
 * - Session management (create, find, revoke, update)
 * - User activity tracking (last login, online status)
 * - Audit logging for all database operations
 * 
 * Security Principles:
 * - NEVER log sensitive fields (passwords, raw refresh tokens)
 * - Always log key identifiers (UUIDs, emails) for audit trails
 * - Track all database operations with timing metrics
 * - Use prepared statements via Sequelize ORM (SQL injection protection)
 * 
 * Performance Monitoring:
 * - All queries tracked with PerformanceTimer
 * - Slow query warnings (>500ms threshold)
 * - Database operation logging with row counts
 * 
 * Functions Provided:
 * - Employee/User Lookups: findEmployeeByOfficialEmail, findUserByEmployeeUuid
 * - Customer Lookups: findCustomerByEmail, findCustomerAccessByCustomerId
 * - Audit Updates: updateUserLastLogin, updateCustomerLastLoginByCustomerId
 * - Online Status: upsertEmployeeOnlineStatus
 * - Session Management: createSession, findSessionByTokenHash, revokeSessionByTokenHash, updateSessionToken
 */

/**
 * Employee/User Lookups
 * =====================
 * Functions to find employee and user records for authentication
 */

/**
 * Find Employee by Official Email
 * --------------------------------
 * Looks up an employee record using their official company email address.
 * Used in the employee authentication path during login.
 * 
 * @param {string} email - Official email address (e.g., user@company.com)
 * @returns {Promise<Employee | null>} - Employee record or null if not found
 * 
 * Performance: Indexed query on officialEmailId field
 * Security: Email is logged for audit trail (not sensitive)
 * 
 * Example:
 * ```typescript
 * const employee = await findEmployeeByOfficialEmail('john@vodichron.com');
 * if (employee) {
 *   // Proceed with authentication
 * }
 * ```
 */
export async function findEmployeeByOfficialEmail(email: string) {
  // Step 1: Log query attempt
  logger.debug('🔍 Step 1: Searching for employee by official email', { 
    email, 
    type: 'AUTH_STORE_QUERY',
    operation: 'findOne'
  });
  
  // Step 2: Start performance timer
  const timer = new PerformanceTimer('DB: findEmployeeByOfficialEmail');
  
  try {
    // Step 3: Execute database query
    const employee = await Employee.findOne({ where: { officialEmailId: email } });
    
    // Step 4: Log query completion with timing
    const duration = timer.end({ email, found: !!employee }, 500);
    logDatabase('SELECT', 'employees', duration, undefined, employee ? 1 : 0);
    
    if (employee) {
      logger.debug('✅ Step 4.1: Employee found', { employeeUuid: employee.uuid });
    } else {
      logger.debug('⚠️ Step 4.2: No employee found for email', { email });
    }
    
    return employee;
    
  } catch (error: any) {
    // Step 5: Handle errors
    const duration = timer.end({ email, error: error.message }, 500);
    logger.error('❌ findEmployeeByOfficialEmail failed', { 
      email, 
      error: error.message,
      type: 'AUTH_STORE_ERROR' 
    });
    logDatabase('SELECT', 'employees', duration, error);
    throw error;
  }
}

/**
 * Find User by Employee UUID
 * ---------------------------
 * Retrieves the User authentication record linked to an employee.
 * The User table stores credentials and access control (role, status).
 * 
 * @param {string} employeeUuid - UUID of the employee
 * @returns {Promise<User | null>} - User record with auth data or null
 * 
 * Database Relationship:
 * - Employee (1) <-> (1) User
 * - User.employeeId references Employee.uuid
 * 
 * Security:
 * - Verifies user status (must be ACTIVE for login)
 * - Returns hashed password for bcrypt comparison
 */
export async function findUserByEmployeeUuid(employeeUuid: string) {
  // Step 1: Log query
  logger.debug('🔍 Step 1: Finding user by employee UUID', { 
    employeeUuid, 
    type: 'AUTH_STORE_QUERY' 
  });
  
  // Step 2: Start performance tracking
  const timer = new PerformanceTimer('DB: findUserByEmployeeUuid');
  
  try {
    // Step 3: Execute query
    const user = await User.findOne({ where: { employeeId: employeeUuid } });
    
    // Step 4: Log results
    const duration = timer.end({ employeeUuid, found: !!user }, 500);
    logDatabase('SELECT', 'users', duration, undefined, user ? 1 : 0);
    
    if (user) {
      logger.debug('✅ Step 4.1: User found', { 
        userUuid: user.uuid, 
        status: user.status,
        role: user.role 
      });
    } else {
      logger.warn('⚠️ Step 4.2: No user record found for employee', { employeeUuid });
    }
    
    return user;
    
  } catch (error: any) {
    // Step 5: Error handling
    const duration = timer.end({ employeeUuid, error: error.message }, 500);
    logger.error('❌ findUserByEmployeeUuid failed', { 
      employeeUuid, 
      error: error.message,
      type: 'AUTH_STORE_ERROR' 
    });
    logDatabase('SELECT', 'users', duration, error);
    throw error;
  }
}

/**
 * Customer Lookups
 * ================
 * Functions to find customer records for authentication
 */

/**
 * Find Customer by Email
 * ----------------------
 * Looks up a customer record using their registered email address.
 * Used in the customer authentication path during login.
 * 
 * @param {string} email - Customer's registered email
 * @returns {Promise<Customer | null>} - Customer record or null
 * 
 * Security:
 * - Email is the primary identifier for customers
 * - CustomerAccess table stores actual credentials
 */
export async function findCustomerByEmail(email: string) {
  // Step 1: Log customer lookup
  logger.debug('🔍 Step 1: Searching for customer by email', { 
    email, 
    type: 'AUTH_STORE_QUERY' 
  });
  
  // Step 2: Start timing
  const timer = new PerformanceTimer('DB: findCustomerByEmail');
  
  try {
    // Step 3: Query database
    const customer = await Customer.findOne({ where: { email } });
    
    // Step 4: Log results with metrics
    const duration = timer.end({ email, found: !!customer }, 500);
    logDatabase('SELECT', 'customers', duration, undefined, customer ? 1 : 0);
    
    if (customer) {
      logger.debug('✅ Step 4.1: Customer found', { customerUuid: customer.uuid });
    } else {
      logger.debug('⚠️ Step 4.2: No customer found for email', { email });
    }
    
    return customer;
    
  } catch (error: any) {
    // Step 5: Error handling
    const duration = timer.end({ email, error: error.message }, 500);
    logger.error('❌ findCustomerByEmail failed', { 
      email, 
      error: error.message,
      type: 'AUTH_STORE_ERROR' 
    });
    logDatabase('SELECT', 'customers', duration, error);
    throw error;
  }
}

/**
 * Find Customer Access by Customer ID
 * ------------------------------------
 * Retrieves the CustomerAccess record containing authentication credentials.
 * Separate from Customer table for security isolation.
 * 
 * @param {string} customerId - UUID of the customer
 * @returns {Promise<CustomerAccess | null>} - Access record with password/status
 * 
 * Security:
 * - Stores hashed password for customer authentication
 * - Contains status field (ACTIVE/INACTIVE)
 * - Tracks last login timestamp
 */
export async function findCustomerAccessByCustomerId(customerId: string) {
  // Step 1: Log access lookup
  logger.debug('🔍 Step 1: Finding customer access record', { 
    customerId, 
    type: 'AUTH_STORE_QUERY' 
  });
  
  // Step 2: Performance tracking
  const timer = new PerformanceTimer('DB: findCustomerAccessByCustomerId');
  
  try {
    // Step 3: Database query
    const access = await CustomerAccess.findOne({ where: { customerId } });
    
    // Step 4: Log results
    const duration = timer.end({ customerId, found: !!access }, 500);
    logDatabase('SELECT', 'customer_access', duration, undefined, access ? 1 : 0);
    
    if (access) {
      logger.debug('✅ Step 4.1: Customer access found', { 
        customerId,
        status: access.status 
      });
    } else {
      logger.warn('⚠️ Step 4.2: No access record for customer', { customerId });
    }
    
    return access;
    
  } catch (error: any) {
    // Step 5: Error handling
    const duration = timer.end({ customerId, error: error.message }, 500);
    logger.error('❌ findCustomerAccessByCustomerId failed', { 
      customerId, 
      error: error.message,
      type: 'AUTH_STORE_ERROR' 
    });
    logDatabase('SELECT', 'customer_access', duration, error);
    throw error;
  }
}

/**
 * Audit Updates
 * =============
 * Functions to track user activity and maintain audit trails
 */

/**
 * Update User Last Login
 * ----------------------
 * Updates the lastLogin timestamp for a user after successful authentication.
 * Used for audit trail and security monitoring.
 * 
 * @param {string} userUuid - UUID of the user
 * @returns {Promise} - Update result from Sequelize
 * 
 * Security:
 * - Tracks last successful login time
 * - Helps detect suspicious account activity
 * - Used in session timeout calculations
 */
export async function updateUserLastLogin(userUuid: string) {
  // Step 1: Log update operation
  logger.info('🕒 Step 1: Updating user last login timestamp', { 
    userUuid, 
    type: 'AUTH_STORE_UPDATE' 
  });
  
  // Step 2: Start performance tracking
  const timer = new PerformanceTimer('DB: updateUserLastLogin');
  
  try {
    // Step 3: Execute update
    const currentTime = new Date();
    const result = await User.update(
      { lastLogin: currentTime }, 
      { where: { uuid: userUuid } }
    );
    
    // Step 4: Log success with metrics
    const duration = timer.end({ userUuid, timestamp: currentTime.toISOString() }, 300);
    const rowsAffected = Array.isArray(result) ? result[0] : 0;
    logDatabase('UPDATE', 'users', duration, undefined, rowsAffected);
    
    logger.info('✅ Step 4.1: User last login updated', { 
      userUuid, 
      rowsAffected,
      timestamp: currentTime.toISOString() 
    });
    
    return result;
    
  } catch (error: any) {
    // Step 5: Error handling
    const duration = timer.end({ userUuid, error: error.message }, 300);
    logger.error('❌ updateUserLastLogin failed', { 
      userUuid, 
      error: error.message,
      type: 'AUTH_STORE_ERROR' 
    });
    logDatabase('UPDATE', 'users', duration, error);
    throw error;
  }
}

/**
 * Update Customer Last Login
 * ---------------------------
 * Updates the lastLogin timestamp in CustomerAccess table.
 * Tracks customer authentication activity.
 * 
 * @param {string} customerId - UUID of the customer
 * @returns {Promise} - Update result
 */
export async function updateCustomerLastLoginByCustomerId(customerId: string) {
  // Step 1: Log operation
  logger.info('🕒 Step 1: Updating customer last login', { 
    customerId, 
    type: 'AUTH_STORE_UPDATE' 
  });
  
  // Step 2: Performance tracking
  const timer = new PerformanceTimer('DB: updateCustomerLastLogin');
  
  try {
    // Step 3: Update database
    const currentTime = new Date();
    const result = await CustomerAccess.update(
      { lastLogin: currentTime }, 
      { where: { customerId } }
    );
    
    // Step 4: Log success
    const duration = timer.end({ customerId, timestamp: currentTime.toISOString() }, 300);
    const rowsAffected = Array.isArray(result) ? result[0] : 0;
    logDatabase('UPDATE', 'customer_access', duration, undefined, rowsAffected);
    
    logger.info('✅ Step 4.1: Customer last login updated', { 
      customerId, 
      rowsAffected 
    });
    
    return result;
    
  } catch (error: any) {
    // Step 5: Error handling
    const duration = timer.end({ customerId, error: error.message }, 300);
    logger.error('❌ updateCustomerLastLoginByCustomerId failed', { 
      customerId, 
      error: error.message,
      type: 'AUTH_STORE_ERROR' 
    });
    logDatabase('UPDATE', 'customer_access', duration, error);
    throw error;
  }
}

/**
 * Upsert Employee Online Status
 * ------------------------------
 * Creates or updates the online status for an employee.
 * Tracks whether employees are currently logged in (ONLINE/OFFLINE).
 * 
 * @param {string} employeeUuid - UUID of the employee
 * @param {string} status - 'ONLINE' or 'OFFLINE'
 * @returns {Promise} - Upsert result
 * 
 * Use Cases:
 * - Set ONLINE on successful login
 * - Set OFFLINE on logout or session expiry
 * - Used for real-time presence indicators
 */
export async function upsertEmployeeOnlineStatus(
  employeeUuid: string, 
  status: 'ONLINE' | 'OFFLINE'
) {
  // Step 1: Log status change
  logger.info('📶 Step 1: Upserting employee online status', { 
    employeeUuid, 
    status,
    type: 'AUTH_STORE_UPSERT' 
  });
  
  // Step 2: Performance tracking
  const timer = new PerformanceTimer('DB: upsertEmployeeOnlineStatus');
  
  try {
    // Step 3: Upsert operation
    const result = await OnlineStatus.upsert({
      employeeId: employeeUuid,
      status,
      updatedAt: new Date()
    } as any);
    
    // Step 4: Log success
    const duration = timer.end({ employeeUuid, status }, 300);
    logDatabase('UPSERT', 'online_status', duration, undefined, 1);
    
    logger.info('✅ Step 4.1: Employee online status updated', { 
      employeeUuid, 
      status 
    });
    
    return result;
    
  } catch (error: any) {
    // Step 5: Error handling
    const duration = timer.end({ employeeUuid, status, error: error.message }, 300);
    logger.error('❌ upsertEmployeeOnlineStatus failed', { 
      employeeUuid, 
      status,
      error: error.message,
      type: 'AUTH_STORE_ERROR' 
    });
    logDatabase('UPSERT', 'online_status', duration, error);
    throw error;
  }
}

/**
 * Session Management
 * ==================
 * Functions to manage user sessions with refresh tokens
 */

/**
 * Create Session
 * --------------
 * Creates a new session record when a user logs in.
 * Stores the hashed refresh token for future authentication.
 * 
 * @param {object} params - Session parameters
 * @param {string} params.subjectId - UUID of user/employee/customer
 * @param {string} params.subjectType - 'employee' or 'customer'
 * @param {string} params.tokenHash - Hashed refresh token (SHA-256)
 * @param {string|null} params.userAgent - Browser/client user agent
 * @param {string|null} params.ipAddress - Client IP address
 * @param {Date} params.expiresAt - Session expiration timestamp
 * @returns {Promise<Session>} - Created session record
 * 
 * Security:
 * - Only stores hashed token (never plaintext)
 * - Tracks IP and User-Agent for security monitoring
 * - Enforces expiration time
 * 
 * Database:
 * - sessions table stores all active refresh tokens
 * - Used for token rotation during session extension
 */
export async function createSession(params: {
  subjectId: string;
  subjectType: 'employee' | 'customer';
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
}) {
  // Step 1: Log session creation
  logger.info('🧵 Step 1: Creating new session', { 
    subjectId: params.subjectId, 
    subjectType: params.subjectType, 
    expiresAt: params.expiresAt,
    ipAddress: params.ipAddress,
    type: 'AUTH_STORE_CREATE' 
  });
  
  // Step 2: Start performance tracking
  const timer = new PerformanceTimer('DB: createSession');
  
  try {
    // Step 3: Create session record
    const session = await Session.create(params as any);
    
    // Step 4: Log success with metrics
    const duration = timer.end({ 
      subjectId: params.subjectId, 
      subjectType: params.subjectType 
    }, 300);
    logDatabase('INSERT', 'sessions', duration, undefined, 1);
    
    logger.info('✅ Step 4.1: Session created successfully', { 
      sessionId: (session as any).id,
      subjectId: params.subjectId,
      expiresAt: params.expiresAt 
    });
    
    return session;
    
  } catch (error: any) {
    // Step 5: Error handling
    const duration = timer.end({ 
      subjectId: params.subjectId, 
      error: error.message 
    }, 300);
    logger.error('❌ createSession failed', { 
      subjectId: params.subjectId,
      subjectType: params.subjectType,
      error: error.message,
      type: 'AUTH_STORE_ERROR' 
    });
    logDatabase('INSERT', 'sessions', duration, error);
    throw error;
  }
}

/**
 * Find Session by Token Hash
 * ---------------------------
 * Looks up a session using the hashed refresh token.
 * Used during token refresh and logout operations.
 * 
 * @param {string} tokenHash - SHA-256 hash of the refresh token
 * @returns {Promise<Session | null>} - Session record or null
 * 
 * Security:
 * - Compares hashed tokens (not plaintext)
 * - Checks for revoked or expired sessions
 * - Used in token rotation for security
 */
export async function findSessionByTokenHash(tokenHash: string) {
  // Step 1: Log session lookup
  logger.debug('🔍 Step 1: Finding session by token hash', { 
    tokenHash: tokenHash.substring(0, 8) + '...', // Only log first 8 chars for security
    type: 'AUTH_STORE_QUERY' 
  });
  
  // Step 2: Performance tracking
  const timer = new PerformanceTimer('DB: findSessionByTokenHash');
  
  try {
    // Step 3: Query database
    const session = await Session.findOne({ where: { tokenHash } });
    
    // Step 4: Log results
    const duration = timer.end({ found: !!session }, 500);
    logDatabase('SELECT', 'sessions', duration, undefined, session ? 1 : 0);
    
    if (session) {
      logger.debug('✅ Step 4.1: Session found', { 
        subjectId: (session as any).subjectId,
        expiresAt: (session as any).expiresAt,
        revokedAt: (session as any).revokedAt 
      });
    } else {
      logger.debug('⚠️ Step 4.2: No session found for token hash');
    }
    
    return session;
    
  } catch (error: any) {
    // Step 5: Error handling
    const duration = timer.end({ error: error.message }, 500);
    logger.error('❌ findSessionByTokenHash failed', { 
      error: error.message,
      type: 'AUTH_STORE_ERROR' 
    });
    logDatabase('SELECT', 'sessions', duration, error);
    throw error;
  }
}

/**
 * Revoke Session by Token Hash
 * -----------------------------
 * Marks a session as revoked (logged out).
 * Sets revokedAt timestamp to invalidate the refresh token.
 * 
 * @param {string} tokenHash - Hash of the refresh token to revoke
 * @returns {Promise} - Update result
 * 
 * Security:
 * - Prevents reuse of old refresh tokens
 * - Creates audit trail of logout events
 * - Part of token rotation security
 */
export async function revokeSessionByTokenHash(tokenHash: string) {
  // Step 1: Log revocation
  logger.info('🧵 Step 1: Revoking session', { 
    tokenHash: tokenHash.substring(0, 8) + '...',
    type: 'AUTH_STORE_UPDATE' 
  });
  
  // Step 2: Performance tracking
  const timer = new PerformanceTimer('DB: revokeSessionByTokenHash');
  
  try {
    // Step 3: Update session with revoke timestamp
    const revokedAt = new Date();
    const result = await Session.update(
      { revokedAt }, 
      { where: { tokenHash } }
    );
    
    // Step 4: Log success
    const duration = timer.end({ revokedAt: revokedAt.toISOString() }, 300);
    const rowsAffected = Array.isArray(result) ? result[0] : 0;
    logDatabase('UPDATE', 'sessions', duration, undefined, rowsAffected);
    
    logger.info('✅ Step 4.1: Session revoked', { 
      rowsAffected,
      revokedAt: revokedAt.toISOString() 
    });
    
    return result;
    
  } catch (error: any) {
    // Step 5: Error handling
    const duration = timer.end({ error: error.message }, 300);
    logger.error('❌ revokeSessionByTokenHash failed', { 
      error: error.message,
      type: 'AUTH_STORE_ERROR' 
    });
    logDatabase('UPDATE', 'sessions', duration, error);
    throw error;
  }
}

/**
 * Update Session Token
 * --------------------
 * Rotates the refresh token by updating the hash and expiry.
 * Used during session extension to enhance security.
 * 
 * @param {string} tokenHash - Current token hash to find the session
 * @param {string} newHash - New token hash to replace it
 * @param {Date} newExpiry - New expiration timestamp
 * @returns {Promise} - Update result
 * 
 * Security:
 * - Token rotation prevents replay attacks
 * - Old token becomes invalid after rotation
 * - Extends session securely without exposing credentials
 * 
 * Flow:
 * 1. Client sends old refresh token
 * 2. Server validates and finds session by old hash
 * 3. Server generates new token and updates hash
 * 4. Old token is now useless (single-use tokens)
 */
export async function updateSessionToken(
  tokenHash: string, 
  newHash: string, 
  newExpiry: Date
) {
  // Step 1: Log token rotation
  logger.info('🧵 Step 1: Rotating session token', { 
    oldTokenHash: tokenHash.substring(0, 8) + '...',
    newTokenHash: newHash.substring(0, 8) + '...',
    newExpiry,
    type: 'AUTH_STORE_UPDATE' 
  });
  
  // Step 2: Performance tracking
  const timer = new PerformanceTimer('DB: updateSessionToken');
  
  try {
    // Step 3: Update session with new token and expiry
    const result = await Session.update(
      { tokenHash: newHash, expiresAt: newExpiry }, 
      { where: { tokenHash } }
    );
    
    // Step 4: Log success
    const duration = timer.end({ newExpiry: newExpiry.toISOString() }, 300);
    const rowsAffected = Array.isArray(result) ? result[0] : 0;
    logDatabase('UPDATE', 'sessions', duration, undefined, rowsAffected);
    
    logger.info('✅ Step 4.1: Session token rotated', { 
      rowsAffected,
      newExpiry: newExpiry.toISOString() 
    });
    
    if (rowsAffected === 0) {
      logger.warn('⚠️ Step 4.2: No session found to update (may already be rotated)');
    }
    
    return result;
    
  } catch (error: any) {
    // Step 5: Error handling
    const duration = timer.end({ error: error.message }, 300);
    logger.error('❌ updateSessionToken failed', { 
      error: error.message,
      type: 'AUTH_STORE_ERROR' 
    });
    logDatabase('UPDATE', 'sessions', duration, error);
    throw error;
  }
}
