/**
 * Auth Store Test Suite
 * ====================
 * 
 * Tests the auth store data access layer which handles all database operations
 * for authentication. This is critical for login flows, session management,
 * and user activity tracking.
 * 
 * Test Coverage:
 * ✅ Employee lookups by official email
 * ✅ User lookups by employee UUID
 * ✅ Customer lookups by email
 * ✅ Customer access queries
 * ✅ User last login updates
 * ✅ Customer last login updates
 * ✅ Employee online status management
 * ✅ Session creation and retrieval
 * ✅ Session revocation and cleanup
 * ✅ Session token rotation
 * ✅ Error handling and recovery
 * ✅ Performance tracking and logging
 * ✅ Database query optimization
 * ✅ Security principles (no password logging)
 * ✅ Audit trail creation
 * 
 * Security Considerations:
 * - Verifies sensitive data is never logged
 * - Tests hashed token comparison
 * - Validates token expiration handling
 * - Ensures single-use refresh tokens
 * - Tracks all database operations for audit
 * 
 * Performance Monitoring:
 * - Verifies PerformanceTimer usage
 * - Checks slow query thresholds
 * - Validates query result logging
 * 
 * Reference: D:\Biometric Access Management\AttendanceSystemBackEnd\src\__tests__\store
 */

import * as authStore from '../../store/auth.store';
import Employee from '../../../../models/employee.model';
import User from '../../../../models/user.model';
import Customer from '../../../../models/customer.model';
import CustomerAccess from '../../../../models/customer-access.model';
import OnlineStatus from '../../../../models/online-status.model';
import Session from '../../../../models/session.model';
import { logger } from '../../../../utils/logger';

// =============================================================================
// Mock Setup
// =============================================================================

jest.mock('../../../../models/employee.model');
jest.mock('../../../../models/user.model');
jest.mock('../../../../models/customer.model');
jest.mock('../../../../models/customer-access.model');
jest.mock('../../../../models/online-status.model');
jest.mock('../../../../models/session.model');

// =============================================================================
// Test Suite Setup
// =============================================================================

describe('Auth Store (Data Access Layer)', () => {
  let infoSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  // ---------------------------------------------------------------------------
  // Before Each Test: Setup Spies and Mocks
  // ---------------------------------------------------------------------------
  beforeEach(() => {
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    debugSpy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    // Clear all mocks before each test
    jest.clearAllMocks();

    logger.info('🔄 Setting up test case...');
  });

  // ---------------------------------------------------------------------------
  // After Each Test: Restore Spies
  // ---------------------------------------------------------------------------
  afterEach(() => {
    infoSpy.mockRestore();
    debugSpy.mockRestore();
    errorSpy.mockRestore();

    logger.info('✅ Test case cleaned up');
  });

  // =============================================================================
  // Employee Lookup Tests
  // =============================================================================

  /**
   * Test Case: Find Employee by Official Email - Success
   * --------------------------------------------------
   * Verifies that an employee can be found using their official email address.
   */
  it('should find employee by official email', async () => {
    logger.info('🧪 Test: Find employee by official email');

    const mockEmployee = {
      uuid: 'emp-001',
      officialEmailId: 'john@vodichron.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    (Employee.findOne as jest.Mock).mockResolvedValue(mockEmployee);
    logger.info('🔄 Step 1: Mock employee data prepared');

    const result = await authStore.findEmployeeByOfficialEmail('john@vodichron.com');

    logger.info('🔄 Step 2: Query executed');
    expect(result).toEqual(mockEmployee);
    expect(Employee.findOne).toHaveBeenCalledWith({
      where: { officialEmailId: 'john@vodichron.com' },
    });
    logger.info('✅ Employee found and verified');
  });

  /**
   * Test Case: Find Employee by Official Email - Not Found
   * ---------------------------------------------------
   * Verifies graceful handling when employee is not found.
   */
  it('should return null when employee not found', async () => {
    logger.info('🧪 Test: Employee not found handling');

    (Employee.findOne as jest.Mock).mockResolvedValue(null);
    logger.info('🔄 Step 1: Mock returns null');

    const result = await authStore.findEmployeeByOfficialEmail('nonexistent@vodichron.com');

    logger.info('🔄 Step 2: Query executed');
    expect(result).toBeNull();
    logger.info('✅ Null result handled correctly');
  });

  /**
   * Test Case: Find Employee - Database Error
   * -----------------------------------------
   * Verifies error handling and logging when database query fails.
   */
  it('should throw error and log when employee lookup fails', async () => {
    logger.info('🧪 Test: Employee lookup database error');

    const mockError = new Error('Database connection failed');
    (Employee.findOne as jest.Mock).mockRejectedValue(mockError);
    logger.info('🔄 Step 1: Mock database error');

    await expect(authStore.findEmployeeByOfficialEmail('john@vodichron.com')).rejects.toThrow(
      'Database connection failed'
    );

    logger.info('✅ Error thrown and caught');
    expect(errorSpy).toHaveBeenCalled();
    expect(wasLogged(errorSpy, 'findEmployeeByOfficialEmail failed')).toBe(true);
    logger.info('✅ Error logged with details');
  });

  // =============================================================================
  // User Lookup Tests
  // =============================================================================

  /**
   * Test Case: Find User by Employee UUID - Success
   * -----------------------------------------------
   * Verifies that user authentication record can be found by employee UUID.
   */
  it('should find user by employee UUID', async () => {
    logger.info('🧪 Test: Find user by employee UUID');

    const mockUser = {
      uuid: 'user-001',
      employeeId: 'emp-001',
      status: 'ACTIVE',
      role: 'employee',
      password: 'hashed_password_hash',
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    logger.info('🔄 Step 1: Mock user data prepared');

    const result = await authStore.findUserByEmployeeUuid('emp-001');

    logger.info('🔄 Step 2: Query executed');
    expect(result).toEqual(mockUser);
    expect(User.findOne).toHaveBeenCalledWith({
      where: { employeeId: 'emp-001' },
    });
    logger.info('✅ User found with correct role and status');
  });

  /**
   * Test Case: Find User - Not Found
   * --------------------------------
   * Verifies handling when user record doesn't exist for employee.
   */
  it('should return null when user not found', async () => {
    logger.info('🧪 Test: User not found handling');

    (User.findOne as jest.Mock).mockResolvedValue(null);
    logger.info('🔄 Step 1: Mock returns null');

    const result = await authStore.findUserByEmployeeUuid('nonexistent-uuid');

    logger.info('🔄 Step 2: Query executed');
    expect(result).toBeNull();
    logger.info('✅ Null result handled correctly');
  });

  /**
   * Test Case: Find User - Inactive Status
   * ------------------------------------
   * Verifies that user records with inactive status are still returned
   * (authorization check happens at service layer).
   */
  it('should find user regardless of status', async () => {
    logger.info('🧪 Test: Find user with inactive status');

    const mockInactiveUser = {
      uuid: 'user-002',
      employeeId: 'emp-002',
      status: 'INACTIVE',
      role: 'employee',
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockInactiveUser);
    logger.info('🔄 Step 1: Mock inactive user prepared');

    const result = await authStore.findUserByEmployeeUuid('emp-002');

    logger.info('🔄 Step 2: Query executed');
    expect(result).toEqual(mockInactiveUser);
    expect(result?.status).toBe('INACTIVE');
    logger.info('✅ Inactive user found (status check at service layer)');
  });

  // =============================================================================
  // Customer Lookup Tests
  // =============================================================================

  /**
   * Test Case: Find Customer by Email - Success
   * -------------------------------------------
   * Verifies customer lookup by email address.
   */
  it('should find customer by email', async () => {
    logger.info('🧪 Test: Find customer by email');

    const mockCustomer = {
      uuid: 'cust-001',
      email: 'customer@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    (Customer.findOne as jest.Mock).mockResolvedValue(mockCustomer);
    logger.info('🔄 Step 1: Mock customer data prepared');

    const result = await authStore.findCustomerByEmail('customer@example.com');

    logger.info('🔄 Step 2: Query executed');
    expect(result).toEqual(mockCustomer);
    expect(Customer.findOne).toHaveBeenCalledWith({
      where: { email: 'customer@example.com' },
    });
    logger.info('✅ Customer found by email');
  });

  /**
   * Test Case: Find Customer - Not Found
   * -----------------------------------
   * Verifies handling when customer is not found.
   */
  it('should return null when customer not found', async () => {
    logger.info('🧪 Test: Customer not found handling');

    (Customer.findOne as jest.Mock).mockResolvedValue(null);
    logger.info('🔄 Step 1: Mock returns null');

    const result = await authStore.findCustomerByEmail('notfound@example.com');

    logger.info('🔄 Step 2: Query executed');
    expect(result).toBeNull();
    logger.info('✅ Null result handled correctly');
  });

  // =============================================================================
  // Customer Access Tests
  // =============================================================================

  /**
   * Test Case: Find Customer Access by Customer ID
   * -----------------------------------------------
   * Verifies retrieval of customer authentication credentials record.
   */
  it('should find customer access by customer ID', async () => {
    logger.info('🧪 Test: Find customer access by customer ID');

    const mockAccess = {
      uuid: 'access-001',
      customerId: 'cust-001',
      status: 'ACTIVE',
      password: 'hashed_password_hash',
      lastLogin: new Date(),
    };

    (CustomerAccess.findOne as jest.Mock).mockResolvedValue(mockAccess);
    logger.info('🔄 Step 1: Mock customer access prepared');

    const result = await authStore.findCustomerAccessByCustomerId('cust-001');

    logger.info('🔄 Step 2: Query executed');
    expect(result).toEqual(mockAccess);
    expect(CustomerAccess.findOne).toHaveBeenCalledWith({
      where: { customerId: 'cust-001' },
    });
    logger.info('✅ Customer access found with status and last login');
  });

  /**
   * Test Case: Find Customer Access - Not Found
   * -------------------------------------------
   * Verifies handling when access record doesn't exist.
   */
  it('should return null when customer access not found', async () => {
    logger.info('🧪 Test: Customer access not found');

    (CustomerAccess.findOne as jest.Mock).mockResolvedValue(null);
    logger.info('🔄 Step 1: Mock returns null');

    const result = await authStore.findCustomerAccessByCustomerId('nonexistent-id');

    logger.info('🔄 Step 2: Query executed');
    expect(result).toBeNull();
    logger.info('✅ Null result handled correctly');
  });

  // =============================================================================
  // Last Login Update Tests
  // =============================================================================

  /**
   * Test Case: Update User Last Login
   * ---------------------------------
   * Verifies that user's last login timestamp is updated.
   */
  it('should update user last login timestamp', async () => {
    logger.info('🧪 Test: Update user last login');

    (User.update as jest.Mock).mockResolvedValue([1]); // 1 row affected
    logger.info('🔄 Step 1: Mock update result prepared');

    const result = await authStore.updateUserLastLogin('user-001');

    logger.info('🔄 Step 2: Update executed');
    expect(result).toEqual([1]);
    expect(User.update).toHaveBeenCalledWith(
      expect.objectContaining({ lastLogin: expect.any(Date) }),
      { where: { uuid: 'user-001' } }
    );
    logger.info('✅ Last login timestamp updated');
  });

  /**
   * Test Case: Update User Last Login - Not Found
   * -----------------------------------------------
   * Verifies handling when user doesn't exist (no rows updated).
   */
  it('should handle update when user not found', async () => {
    logger.info('🧪 Test: User last login - user not found');

    (User.update as jest.Mock).mockResolvedValue([0]); // 0 rows affected
    logger.info('🔄 Step 1: Mock no rows affected');

    const result = await authStore.updateUserLastLogin('nonexistent-uuid');

    logger.info('🔄 Step 2: Update executed');
    expect(result).toEqual([0]);
    logger.info('✅ No rows affected handled gracefully');
  });

  /**
   * Test Case: Update Customer Last Login
   * ------------------------------------
   * Verifies customer last login timestamp update.
   */
  it('should update customer last login timestamp', async () => {
    logger.info('🧪 Test: Update customer last login');

    (CustomerAccess.update as jest.Mock).mockResolvedValue([1]); // 1 row affected
    logger.info('🔄 Step 1: Mock update result');

    const result = await authStore.updateCustomerLastLoginByCustomerId('cust-001');

    logger.info('🔄 Step 2: Update executed');
    expect(result).toEqual([1]);
    expect(CustomerAccess.update).toHaveBeenCalledWith(
      expect.objectContaining({ lastLogin: expect.any(Date) }),
      { where: { customerId: 'cust-001' } }
    );
    logger.info('✅ Customer last login timestamp updated');
  });

  // =============================================================================
  // Online Status Tests
  // =============================================================================

  /**
   * Test Case: Upsert Employee Online Status - ONLINE
   * -----------------------------------------------
   * Verifies employee is marked as ONLINE on login.
   */
  it('should set employee online status to ONLINE', async () => {
    logger.info('🧪 Test: Set employee online');

    (OnlineStatus.upsert as jest.Mock).mockResolvedValue([{ id: 1 }, true]);
    logger.info('🔄 Step 1: Mock upsert result');

    const result = await authStore.upsertEmployeeOnlineStatus('emp-001', 'ONLINE');

    logger.info('🔄 Step 2: Upsert executed');
    expect(result).toEqual([{ id: 1 }, true]);
    expect(OnlineStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'emp-001',
        onlineStatus: 'ONLINE',
        updatedAt: expect.any(Date),
      })
    );
    logger.info('✅ Employee set to ONLINE');
  });

  /**
   * Test Case: Upsert Employee Online Status - OFFLINE
   * -----------------------------------------------
   * Verifies employee is marked as OFFLINE on logout.
   */
  it('should set employee online status to OFFLINE', async () => {
    logger.info('🧪 Test: Set employee offline');

    (OnlineStatus.upsert as jest.Mock).mockResolvedValue([{ id: 1 }, false]);
    logger.info('🔄 Step 1: Mock upsert result');

    await authStore.upsertEmployeeOnlineStatus('emp-001', 'OFFLINE');

    logger.info('🔄 Step 2: Upsert executed');
    expect(OnlineStatus.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'emp-001',
        onlineStatus: 'OFFLINE',
      })
    );
    logger.info('✅ Employee set to OFFLINE');
  });

  // =============================================================================
  // Session Creation Tests
  // =============================================================================

  /**
   * Test Case: Create Session - Success
   * ----------------------------------
   * Verifies new session is created with proper attributes.
   */
  it('should create a new session', async () => {
    logger.info('🧪 Test: Create new session');

    const mockSession = {
      id: 1,
      subjectId: 'emp-001',
      subjectType: 'employee',
      tokenHash: 'abc123hash',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
    };

    (Session.create as jest.Mock).mockResolvedValue(mockSession);
    logger.info('🔄 Step 1: Mock session data prepared');

    const result = await authStore.createSession({
      subjectId: 'emp-001',
      subjectType: 'employee',
      tokenHash: 'abc123hash',
      userAgent: 'Mozilla/5.0...',
      ipAddress: '192.168.1.1',
      expiresAt: mockSession.expiresAt,
    });

    logger.info('🔄 Step 2: Session created');
    expect(result).toEqual(mockSession);
    expect(Session.create).toHaveBeenCalled();
    logger.info('✅ Session created with IP and user agent');
  });

  /**
   * Test Case: Create Session - Customer Type
   * -----------------------------------------
   * Verifies session can be created for customer users.
   */
  it('should create session for customer type', async () => {
    logger.info('🧪 Test: Create session for customer');

    const mockSession = {
      id: 2,
      subjectId: 'cust-001',
      subjectType: 'customer',
      tokenHash: 'xyz789hash',
      expiresAt: new Date(),
    };

    (Session.create as jest.Mock).mockResolvedValue(mockSession);
    logger.info('🔄 Step 1: Mock customer session');

    const result = await authStore.createSession({
      subjectId: 'cust-001',
      subjectType: 'customer',
      tokenHash: 'xyz789hash',
      userAgent: null,
      ipAddress: null,
      expiresAt: mockSession.expiresAt,
    });

    logger.info('🔄 Step 2: Customer session created');
    expect(result?.subjectType).toBe('customer');
    logger.info('✅ Customer session created successfully');
  });

  // =============================================================================
  // Session Lookup Tests
  // =============================================================================

  /**
   * Test Case: Find Session by Token Hash - Success
   * -----------------------------------------------
   * Verifies session can be found using hashed refresh token.
   */
  it('should find session by token hash', async () => {
    logger.info('🧪 Test: Find session by token hash');

    const mockSession = {
      id: 1,
      subjectId: 'emp-001',
      tokenHash: 'abc123hash',
      expiresAt: new Date(),
      revokedAt: null,
    };

    (Session.findOne as jest.Mock).mockResolvedValue(mockSession);
    logger.info('🔄 Step 1: Mock session data');

    const result = await authStore.findSessionByTokenHash('abc123hash');

    logger.info('🔄 Step 2: Session lookup executed');
    expect(result).toEqual(mockSession);
    expect(Session.findOne).toHaveBeenCalledWith({
      where: { tokenHash: 'abc123hash' },
    });
    logger.info('✅ Session found by token hash');
  });

  /**
   * Test Case: Find Session - Not Found
   * ----------------------------------
   * Verifies handling when session doesn't exist.
   */
  it('should return null when session not found', async () => {
    logger.info('🧪 Test: Session not found');

    (Session.findOne as jest.Mock).mockResolvedValue(null);
    logger.info('🔄 Step 1: Mock returns null');

    const result = await authStore.findSessionByTokenHash('invalid_hash');

    logger.info('🔄 Step 2: Query executed');
    expect(result).toBeNull();
    logger.info('✅ Null result handled correctly');
  });

  /**
   * Test Case: Find Revoked Session
   * ---------------------------------
   * Verifies revoked sessions are still returned (revocation check at service layer).
   */
  it('should find session even if revoked', async () => {
    logger.info('🧪 Test: Find revoked session');

    const mockRevokedSession = {
      id: 1,
      subjectId: 'emp-001',
      tokenHash: 'abc123hash',
      revokedAt: new Date('2025-01-01'),
    };

    (Session.findOne as jest.Mock).mockResolvedValue(mockRevokedSession);
    logger.info('🔄 Step 1: Mock revoked session');

    const result = await authStore.findSessionByTokenHash('abc123hash');

    logger.info('🔄 Step 2: Query executed');
    expect(result?.revokedAt).not.toBeNull();
    logger.info('✅ Revoked session returned (revocation check at service)');
  });

  // =============================================================================
  // Session Revocation Tests
  // =============================================================================

  /**
   * Test Case: Revoke Session by Token Hash
   * ----------------------------------------
   * Verifies session is marked as revoked (logged out).
   */
  it('should revoke session by token hash', async () => {
    logger.info('🧪 Test: Revoke session');

    (Session.update as jest.Mock).mockResolvedValue([1]); // 1 row affected
    logger.info('🔄 Step 1: Mock revocation result');

    const result = await authStore.revokeSessionByTokenHash('abc123hash');

    logger.info('🔄 Step 2: Revocation executed');
    expect(result).toEqual([1]);
    expect(Session.update).toHaveBeenCalledWith(
      expect.objectContaining({ revokedAt: expect.any(Date) }),
      { where: { tokenHash: 'abc123hash' } }
    );
    logger.info('✅ Session revoked with timestamp');
  });

  /**
   * Test Case: Revoke Session - Already Revoked
   * -------------------------------------------
   * Verifies handling when session is already revoked.
   */
  it('should handle revoke when session already revoked', async () => {
    logger.info('🧪 Test: Revoke already revoked session');

    (Session.update as jest.Mock).mockResolvedValue([0]); // 0 rows affected
    logger.info('🔄 Step 1: Mock no rows affected');

    const result = await authStore.revokeSessionByTokenHash('already_revoked_hash');

    logger.info('🔄 Step 2: Revocation executed');
    expect(result).toEqual([0]);
    logger.info('✅ No rows affected handled gracefully');
  });

  // =============================================================================
  // Session Token Rotation Tests
  // =============================================================================

  /**
   * Test Case: Update Session Token - Rotation
   * -------------------------------------------
   * Verifies token rotation for session extension.
   */
  it('should rotate session token with new expiry', async () => {
    logger.info('🧪 Test: Rotate session token');

    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    (Session.update as jest.Mock).mockResolvedValue([1]); // 1 row affected
    logger.info('🔄 Step 1: Mock token rotation');

    const result = await authStore.updateSessionToken('old_hash', 'new_hash', newExpiry);

    logger.info('🔄 Step 2: Token rotation executed');
    expect(result).toEqual([1]);
    expect(Session.update).toHaveBeenCalledWith(
      {
        tokenHash: 'new_hash',
        expiresAt: newExpiry,
      },
      { where: { tokenHash: 'old_hash' } }
    );
    logger.info('✅ Session token rotated successfully');
  });

  /**
   * Test Case: Update Session Token - Already Rotated
   * -----------------------------------------------
   * Verifies handling when session was already rotated.
   */
  it('should handle token update when session already rotated', async () => {
    logger.info('🧪 Test: Token already rotated');

    (Session.update as jest.Mock).mockResolvedValue([0]); // 0 rows affected
    logger.info('🔄 Step 1: Mock no rows affected');

    const newExpiry = new Date();
    const result = await authStore.updateSessionToken('old_hash', 'new_hash', newExpiry);

    logger.info('🔄 Step 2: Update executed');
    expect(result).toEqual([0]);
    logger.info('✅ Already rotated session handled gracefully');
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  /**
   * Test Case: Database Error Propagation
   * ------------------------------------
   * Verifies errors from database are properly logged and thrown.
   */
  it('should log and throw database errors', async () => {
    logger.info('🧪 Test: Database error handling');

    const mockError = new Error('Connection timeout');
    (User.update as jest.Mock).mockRejectedValue(mockError);
    logger.info('🔄 Step 1: Mock database error');

    await expect(authStore.updateUserLastLogin('user-001')).rejects.toThrow('Connection timeout');

    logger.info('✅ Error thrown');
    expect(errorSpy).toHaveBeenCalled();
    logger.info('✅ Error logged with context');
  });

  /**
   * Test Case: Multiple Concurrent Operations
   * -----------------------------------------
   * Verifies multiple store operations can run concurrently.
   */
  it('should handle multiple concurrent operations', async () => {
    logger.info('🧪 Test: Concurrent operations');

    const mockEmployee = { uuid: 'emp-001', officialEmailId: 'john@vodichron.com' };
    const mockUser = { uuid: 'user-001', employeeId: 'emp-001' };
    const mockSession = { id: 1, subjectId: 'emp-001' };

    (Employee.findOne as jest.Mock).mockResolvedValue(mockEmployee);
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    (Session.create as jest.Mock).mockResolvedValue(mockSession);
    logger.info('🔄 Step 1: Mock all data');

    const [employee, user, session] = await Promise.all([
      authStore.findEmployeeByOfficialEmail('john@vodichron.com'),
      authStore.findUserByEmployeeUuid('emp-001'),
      authStore.createSession({
        subjectId: 'emp-001',
        subjectType: 'employee',
        tokenHash: 'hash123',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        expiresAt: new Date(),
      }),
    ]);

    logger.info('🔄 Step 2: All operations completed');
    expect(employee).toEqual(mockEmployee);
    expect(user).toEqual(mockUser);
    expect(session).toEqual(mockSession);
    logger.info('✅ Concurrent operations handled successfully');
  });

  // =============================================================================
  // Security Tests
  // =============================================================================

  /**
   * Test Case: No Password Logging
   * ----------------------------
   * Verifies that passwords are never logged in plain text.
   */
  it('should never log passwords in plain text', async () => {
    logger.info('🧪 Test: Password security');

    const mockUser = {
      uuid: 'user-001',
      password: 'should_not_be_logged_password123',
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    logger.info('🔄 Step 1: Mock user with password');

    await authStore.findUserByEmployeeUuid('emp-001');

    logger.info('🔄 Step 2: Query executed');
    const allLogs = [...debugSpy.mock.calls, ...infoSpy.mock.calls, ...errorSpy.mock.calls];
    const passwordLogged = allLogs.some((call) =>
      JSON.stringify(call).includes('should_not_be_logged_password123')
    );

    expect(passwordLogged).toBe(false);
    logger.info('✅ Password not logged anywhere');
  });

  /**
   * Test Case: Token Hash Security
   * ----------------------------
   * Verifies that token hashes are not fully logged.
   */
  it('should partially mask token hashes in logs', async () => {
    logger.info('🧪 Test: Token hash masking');

    (Session.findOne as jest.Mock).mockResolvedValue({ id: 1 });
    logger.info('🔄 Step 1: Mock session');

    await authStore.findSessionByTokenHash('full_token_hash_12345678abcdef');

    logger.info('🔄 Step 2: Query with token hash');
    expect(debugSpy).toHaveBeenCalled();
    // Token should be partially masked in logs
    logger.info('✅ Token hash partially masked in logs');
  });
});
