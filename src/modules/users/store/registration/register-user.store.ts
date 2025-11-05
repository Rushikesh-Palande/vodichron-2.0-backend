/**
 * Register User Store
 * ===================
 * Database operations for user registration (grant access)
 * 
 * Responsibilities:
 * - Check if user already exists for an employee
 * - Validate employee exists before creating user
 * - Insert new application user record
 * - Handle password hashing and user metadata
 * - Comprehensive logging and error handling
 * 
 * Based on old backend userStore.ts functions
 */

import User from '../../../../models/user.model';
import Employee from '../../../../models/employee.model';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { ApplicationUserRoleType } from '../../schemas/register-user.schemas';

/**
 * Get Application User by Employee ID
 * ====================================
 * Checks if an employee already has an application user account.
 * Used to prevent duplicate user registrations.
 * 
 * @param {string} employeeId - Employee UUID
 * @returns {Promise<User | null>} - User record or null if not found
 * 
 * Old backend equivalent: getApplicationUserByEmployeeId()
 * Location: vodichron-backend-master/src/store/userStore.ts:160-163
 */
export async function getApplicationUserByEmployeeId(employeeId: string) {
  logger.debug('🔍 Checking if user already exists for employee', { 
    employeeId, 
    type: 'USER_STORE_QUERY',
    operation: 'getApplicationUserByEmployeeId'
  });
  
  const timer = new PerformanceTimer('DB: getApplicationUserByEmployeeId');
  
  try {
    const user = await User.findOne({ where: { employeeId } });
    
    const duration = timer.end({ employeeId, found: !!user }, 500);
    logDatabase('SELECT', 'application_users', duration, undefined, user ? 1 : 0);
    
    if (user) {
      logger.debug('⚠️ User already exists for employee', { 
        userUuid: user.uuid, 
        employeeId,
        role: user.role,
        duration: `${duration}ms`
      });
    } else {
      logger.debug('✅ No existing user found for employee', { 
        employeeId,
        duration: `${duration}ms`
      });
    }
    
    return user;
    
  } catch (error: any) {
    const duration = timer.end({ employeeId, error: error.message }, 500);
    logger.error('❌ getApplicationUserByEmployeeId failed', { 
      employeeId, 
      error: error.message,
      type: 'USER_STORE_ERROR' 
    });
    logDatabase('SELECT', 'application_users', duration, error);
    throw error;
  }
}

/**
 * Check if Employee Exists
 * ========================
 * Validates that an employee record exists before creating user account.
 * 
 * @param {string} employeeId - Employee UUID
 * @returns {Promise<Employee | null>} - Employee record or null
 */
export async function getEmployeeByUuid(employeeId: string) {
  logger.debug('🔍 Validating employee exists', { 
    employeeId, 
    type: 'USER_STORE_QUERY',
    operation: 'getEmployeeByUuid'
  });
  
  const timer = new PerformanceTimer('DB: getEmployeeByUuid');
  
  try {
    const employee = await Employee.findOne({ where: { uuid: employeeId } });
    
    const duration = timer.end({ employeeId, found: !!employee }, 500);
    logDatabase('SELECT', 'employees', duration, undefined, employee ? 1 : 0);
    
    if (!employee) {
      logger.warn('⚠️ Employee not found', { 
        employeeId,
        duration: `${duration}ms`
      });
    } else {
      logger.debug('✅ Employee found', { 
        employeeId,
        employeeName: employee.name,
        duration: `${duration}ms`
      });
    }
    
    return employee;
    
  } catch (error: any) {
    const duration = timer.end({ employeeId, error: error.message }, 500);
    logger.error('❌ getEmployeeByUuid failed', { 
      employeeId, 
      error: error.message,
      type: 'USER_STORE_ERROR' 
    });
    logDatabase('SELECT', 'employees', duration, error);
    throw error;
  }
}

/**
 * Insert Application User
 * =======================
 * Creates a new application user account for an employee.
 * 
 * Process:
 * 1. Create user record with Sequelize (UUID auto-generated)
 * 2. Set user metadata (createdBy, updatedBy, status, etc.)
 * 3. Store hashed password (never plaintext)
 * 4. Return the generated UUID
 * 
 * @param {Object} data - User data
 * @param {string} data.employeeId - Employee UUID
 * @param {string} data.password - Hashed password (must be hashed before calling this)
 * @param {ApplicationUserRoleType} data.role - User role
 * @param {string} createdByEmail - Email of user creating this account
 * @returns {Promise<string>} - UUID of created user
 * 
 * Old backend equivalent: insertApplicationUser()
 * Location: vodichron-backend-master/src/store/userStore.ts:126-158
 * 
 * Security Notes:
 * - Password MUST be hashed before calling this function
 * - Never log password (hashed or plaintext)
 * - createdBy/updatedBy tracks audit trail
 */
export async function insertApplicationUser(
  data: {
    employeeId: string;
    password: string;
    role: ApplicationUserRoleType;
  },
  createdByEmail: string
): Promise<string> {
  logger.debug('➕ Creating new application user', { 
    employeeId: data.employeeId,
    role: data.role,
    createdByEmail,
    type: 'USER_STORE_INSERT',
    operation: 'insertApplicationUser'
  });
  
  const timer = new PerformanceTimer('DB: insertApplicationUser');
  
  try {
    // Create user record with Sequelize (UUID auto-generated by model)
    const user = await User.create({
      employeeId: data.employeeId,
      role: data.role,
      password: data.password, // Must already be hashed!
      createdBy: createdByEmail,
      updatedBy: createdByEmail,
      status: 'ACTIVE',
      isSystemGenerated: false,
      passwordUpdateTimestamp: new Date(),
    });
    
    const duration = timer.end({ 
      employeeId: data.employeeId,
      userUuid: user.uuid,
      role: data.role 
    }, 500);
    
    logDatabase('INSERT', 'application_users', duration, undefined, 1);
    
    logger.info('✅ Application user created successfully', { 
      userUuid: user.uuid,
      employeeId: data.employeeId,
      role: data.role,
      createdByEmail,
      duration: `${duration}ms`
    });
    
    return user.uuid;
    
  } catch (error: any) {
    const duration = timer.end({ 
      employeeId: data.employeeId, 
      error: error.message 
    }, 500);
    
    logger.error('❌ insertApplicationUser failed', { 
      employeeId: data.employeeId,
      role: data.role,
      error: error.message,
      code: error.code,
      name: error.name,
      type: 'USER_STORE_ERROR' 
    });
    
    logDatabase('INSERT', 'application_users', duration, error);
    
    // Handle specific Sequelize errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error('Unable to add a user, try again after some time.');
    }
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      throw new Error('Employee not found. Cannot create user for non-existent employee.');
    }
    
    throw error;
  }
}
