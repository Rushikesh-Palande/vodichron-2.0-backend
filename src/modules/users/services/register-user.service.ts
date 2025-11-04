import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { hashPassword } from '../../auth/helpers/hash-password.helper';
import { 
  getApplicationUserByEmployeeId, 
  getEmployeeByUuid,
  insertApplicationUser 
} from '../store/registration/register-user.store';
import { registerUserInputSchema, ApplicationUserRole, type RegisterUserInput } from '../schemas/register-user.schemas';

/**
 * User Registration Service
 * ==========================
 * Business logic for registering new application users (grant access).
 * Based on old backend userController.ts post() function (lines 85-110)
 * 
 * Authorization:
 * - Only Admin/HR/SuperUser roles can register users
 * - Only SuperUsers can create other SuperUsers
 * 
 * Validation:
 * - Employee must exist
 * - Employee must not already have user account
 * - Password must meet complexity requirements
 * - Role must be valid
 * - SuperUsers can only be created by SuperUsers
 */

/**
 * Handle User Registration
 * ------------------------
 * Express service handler for POST /user/register
 * 
 * Old backend logic flow (userController.ts:85-110):
 * 1. Parse and validate input (employeeId, password, role)
 * 2. Check if user already exists for employee
 * 3. Verify authorization for role assignment (SuperUser restriction)
 * 4. Hash the password
 * 5. Insert user into database
 * 6. Return success message
 * 
 * @param {Request} req - Express request (expects body: { employeeId, password, role })
 * @param {Response} res - Express response
 * @returns {Promise<Response>} - Success/error response
 */
export async function handleRegisterUser(req: Request, res: Response) {
  try {
    // Step 1: Extract authenticated user info from request
    // @ts-ignore - req.user is added by auth middleware
    const loggedInUser = req.user;
    
    if (!loggedInUser) {
      logger.warn('⚠️ Unauthenticated user registration attempt', { 
        type: 'USER_REGISTRATION_UNAUTHORIZED' 
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }
    
    const loggedInUserRole = loggedInUser.role;
    const loggedInUserEmail = loggedInUser.email;
    
    logger.info('🔐 User registration attempt', { 
      requestedBy: loggedInUserEmail,
      role: loggedInUserRole,
      type: 'USER_REGISTRATION_START' 
    });
    
    // Step 2: Validate input with Zod schema
    const parseResult = registerUserInputSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      logger.warn('⚠️ User registration validation failed', { 
        errors,
        type: 'USER_REGISTRATION_VALIDATION_ERROR' 
      });
      
      return res.status(400).json({
        success: false,
        message: `Validation failed for fields: ${errors.map((e: any) => e.field).join(', ')}`,
        errors,
        timestamp: new Date().toISOString(),
      });
    }
    
    const userData = parseResult.data;
    
    // Step 3: Validate employee exists
    logger.debug('🔍 Step 3: Validating employee exists', { 
      employeeId: userData.employeeId 
    });
    
    const employee = await getEmployeeByUuid(userData.employeeId);
    
    if (!employee) {
      logger.warn('⚠️ Employee not found for user registration', { 
        employeeId: userData.employeeId,
        type: 'USER_REGISTRATION_EMPLOYEE_NOT_FOUND' 
      });
      
      return res.status(404).json({
        success: false,
        message: 'Employee not found. Cannot create user account for non-existent employee.',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Step 4: Check if user already exists for this employee
    logger.debug('🔍 Step 4: Checking for existing user', { 
      employeeId: userData.employeeId 
    });
    
    const existingUser = await getApplicationUserByEmployeeId(userData.employeeId);
    
    if (existingUser) {
      logger.warn('⚠️ User already exists for employee', { 
        employeeId: userData.employeeId,
        existingUserUuid: existingUser.uuid,
        type: 'USER_REGISTRATION_DUPLICATE' 
      });
      
      return res.status(409).json({
        success: false,
        message: 'User already assigned to application.',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Step 5: Authorization check - Only SuperUsers can create SuperUsers
    // (Old backend logic: userController.ts:94-96)
    if (userData.role === ApplicationUserRole.superUser && loggedInUserRole !== ApplicationUserRole.superUser) {
      logger.warn('⚠️ Unauthorized attempt to create SuperUser', { 
        requestedBy: loggedInUserEmail,
        requestedByRole: loggedInUserRole,
        type: 'USER_REGISTRATION_FORBIDDEN' 
      });
      
      return res.status(403).json({
        success: false,
        message: 'Only Super users can add other Super users.',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Step 6: Hash password
    logger.debug('🔒 Step 6: Hashing password', { 
      employeeId: userData.employeeId 
    });
    
    const hashedPassword = await hashPassword(userData.password);
    
    // Step 7: Insert user into database
    logger.debug('➕ Step 7: Creating application user', { 
      employeeId: userData.employeeId,
      role: userData.role 
    });
    
    const userUuid = await insertApplicationUser(
      {
        employeeId: userData.employeeId,
        password: hashedPassword,
        role: userData.role,
      },
      loggedInUserEmail
    );
    
    // Step 8: Return success response
    logger.info('✅ User registered successfully', { 
      userUuid,
      employeeId: userData.employeeId,
      role: userData.role,
      createdBy: loggedInUserEmail,
      type: 'USER_REGISTRATION_SUCCESS' 
    });
    
    return res.status(201).json({
      success: true,
      message: 'User details saved successfully',
      data: {
        userUuid,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    logger.error('💥 User registration service error', {
      type: 'USER_REGISTRATION_SERVICE_ERROR',
      error: error?.message,
      stack: error?.stack
    });
    
    // Handle specific database errors
    if (error.message === 'Unable to add a user, try again after some time.') {
      return res.status(500).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
