/**
 * Unified Registration Service
 * =============================
 * Business logic for unified employee & user registration
 * 
 * Responsibilities:
 * - Authorization checks (only Admin/HR/SuperUser can register)
 * - Input validation with Zod
 * - Duplicate email/employeeId checks
 * - Orchestrate employee + user creation (via store)
 * - Error handling and logging
 * 
 * Based on old backend combining:
 * - employeeController.create logic
 * - userController.post logic
 */

import { Request, Response } from 'express';
import { TRPCError } from '@trpc/server';
import { logger } from '../../../../utils/logger';
import { unifiedRegisterEmployeeAndUser } from '../../stores/unified/unified-register.store';
import { 
  checkEmployeeIdExists, 
  checkEmployeeEmailExists 
} from '../../stores/crud/create.store';
import { 
  unifiedRegisterSchema, 
  type UnifiedRegisterInput,
  UserRoleMapping 
} from '../../schemas/unified/unified-register.schemas';
import { ApplicationUserRole } from '../../types/employee.types';
import { encryptEmployeeSensitiveFields } from '../../helpers/encrypt-employee-sensitive-fields.helper';

/**
 * Authorization Check
 * ===================
 * Only Admin, HR, and SuperUser can register employees
 * Based on old backend employeeController.create (line 61-63)
 */
function checkAuthorization(userRole: string): void {
  const allowedRoles = [
    ApplicationUserRole.superUser,
    ApplicationUserRole.hr,
  ];

  if (!allowedRoles.includes(userRole as ApplicationUserRole)) {
    throw new Error('Access denied for the operation request.');
  }
}

/**
 * SuperUser Role Check
 * ====================
 * Only SuperUsers can create other SuperUsers
 * Based on old backend userController.post (line 94-96)
 */
function checkSuperUserAuthorization(
  userRole: string,
  targetRole: string
): void {
  const backendRole = UserRoleMapping[targetRole as keyof typeof UserRoleMapping];
  
  if (backendRole === 'super_user' && userRole !== ApplicationUserRole.superUser) {
    throw new Error('Only Super users can add other Super users.');
  }
}

/**
 * Handle Unified Registration (Express Service)
 * ==============================================
 * Express service handler for POST /employee/unified-register
 * 
 * Process:
 * 1. Check authorization (Admin/HR/SuperUser only)
 * 2. Validate input with Zod
 * 3. Check for duplicate employeeId
 * 4. Check for duplicate emails (personal & official)
 * 5. Check SuperUser authorization if creating SuperUser
 * 6. Call store to create employee + user
 * 7. Return both UUIDs
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @returns {Promise<Response>} - Success/error response
 */
export async function handleUnifiedRegister(req: Request, res: Response) {
  try {
    // Step 1: Extract authenticated user
    // @ts-ignore - req.user added by auth middleware
    const loggedInUser = req.user;
    
    if (!loggedInUser) {
      logger.warn('⚠️ Unauthenticated unified registration attempt', {
        type: 'UNIFIED_REGISTER_UNAUTHORIZED'
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const userRole = loggedInUser.role;
    const userEmail = loggedInUser.email;

    logger.info('🔐 Unified registration attempt', {
      requestedBy: userEmail,
      role: userRole,
      type: 'UNIFIED_REGISTER_START'
    });

    // Step 2: Check authorization
    try {
      checkAuthorization(userRole);
    } catch (error: any) {
      logger.warn('⚠️ Unauthorized unified registration attempt', {
        requestedBy: userEmail,
        role: userRole,
        type: 'UNIFIED_REGISTER_FORBIDDEN'
      });
      return res.status(403).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    // Step 3: Validate input with Zod
    const parseResult = unifiedRegisterSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));

      logger.warn('⚠️ Unified registration validation failed', {
        errors,
        type: 'UNIFIED_REGISTER_VALIDATION_ERROR'
      });

      return res.status(400).json({
        success: false,
        message: `Validation failed for fields: ${errors.map((e: any) => e.field).join(', ')}`,
        errors,
        timestamp: new Date().toISOString(),
      });
    }

    const input = parseResult.data;

    // Step 4: Check for duplicate employeeId
    logger.debug('🔍 Step 4: Checking for duplicate employeeId', {
      employeeId: input.employeeId
    });

    const existingEmployeeId = await checkEmployeeIdExists(input.employeeId);

    if (existingEmployeeId) {
      logger.warn('⚠️ Employee ID already exists', {
        employeeId: input.employeeId,
        type: 'UNIFIED_REGISTER_DUPLICATE_ID'
      });

      return res.status(409).json({
        success: false,
        message: 'Employee ID already exists.',
        timestamp: new Date().toISOString(),
      });
    }

    // Step 5: Check for duplicate personal email
    logger.debug('🔍 Step 5: Checking for duplicate personal email', {
      email: input.personalEmail
    });

    const existingPersonalEmail = await checkEmployeeEmailExists(
      input.personalEmail,
      'personalEmail'
    );

    if (existingPersonalEmail) {
      logger.warn('⚠️ Personal email already exists', {
        email: input.personalEmail,
        type: 'UNIFIED_REGISTER_DUPLICATE_PERSONAL_EMAIL'
      });

      return res.status(409).json({
        success: false,
        message: 'Personal email already exists.',
        timestamp: new Date().toISOString(),
      });
    }

    // Step 6: Check for duplicate official email
    logger.debug('🔍 Step 6: Checking for duplicate official email', {
      email: input.officialEmailId
    });

    const existingOfficialEmail = await checkEmployeeEmailExists(
      input.officialEmailId,
      'officialEmailId'
    );

    if (existingOfficialEmail) {
      logger.warn('⚠️ Official email already exists', {
        email: input.officialEmailId,
        type: 'UNIFIED_REGISTER_DUPLICATE_OFFICIAL_EMAIL'
      });

      return res.status(409).json({
        success: false,
        message: 'Official email already exists.',
        timestamp: new Date().toISOString(),
      });
    }

    // Step 7: Check SuperUser authorization
    try {
      checkSuperUserAuthorization(userRole, input.role);
    } catch (error: any) {
      logger.warn('⚠️ Unauthorized attempt to create SuperUser', {
        requestedBy: userEmail,
        requestedByRole: userRole,
        targetRole: input.role,
        type: 'UNIFIED_REGISTER_SUPERUSER_FORBIDDEN'
      });

      return res.status(403).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    // Step 8: Encrypt sensitive fields (PAN, Aadhaar, Bank Account, PF)
    logger.debug('🔐 Step 8: Encrypting sensitive employee data', {
      employeeId: input.employeeId,
      fields: ['panCardNumber', 'bankAccountNumber', 'aadhaarCardNumber', 'pfAccountNumber']
    });

    const encryptedInput = await encryptEmployeeSensitiveFields(input);

    // Step 9: Create employee + user
    logger.debug('➕ Step 9: Creating employee and user', {
      employeeId: input.employeeId,
      role: input.role
    });

    const result = await unifiedRegisterEmployeeAndUser(encryptedInput, userEmail);

    // Step 10: Return success response
    logger.info('✅ Unified registration successful', {
      employeeUuid: result.employeeUuid,
      userUuid: result.userUuid,
      employeeId: input.employeeId,
      role: input.role,
      createdBy: userEmail,
      type: 'UNIFIED_REGISTER_SUCCESS'
    });

    return res.status(201).json({
      success: true,
      message: 'Employee and user registered successfully',
      data: {
        employeeUuid: result.employeeUuid,
        userUuid: result.userUuid,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('💥 Unified registration service error', {
      type: 'UNIFIED_REGISTER_SERVICE_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle Unified Registration (tRPC Service)
 * ===========================================
 * Business logic for tRPC procedure
 * 
 * @param {UnifiedRegisterInput} input - Validated input
 * @param {Object} userContext - User context from tRPC
 * @returns {Promise<{ employeeUuid: string, userUuid: string }>}
 * @throws {TRPCError} - Various error codes
 */
export async function handleUnifiedRegisterTRPC(
  input: UnifiedRegisterInput,
  userContext: { uuid: string; role: string; email: string }
) {
  logger.info('🔐 Unified registration attempt (tRPC)', {
    requestedBy: userContext.email,
    role: userContext.role,
    employeeId: input.employeeId,
    type: 'UNIFIED_REGISTER_TRPC_START'
  });

  // Step 1: Check authorization
  try {
    checkAuthorization(userContext.role);
  } catch (error: any) {
    logger.warn('⚠️ Unauthorized unified registration attempt (tRPC)', {
      requestedBy: userContext.email,
      role: userContext.role,
      type: 'UNIFIED_REGISTER_TRPC_FORBIDDEN'
    });
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: error.message,
    });
  }

  // Step 2: Check for duplicate employeeId
  const existingEmployeeId = await checkEmployeeIdExists(input.employeeId);

  if (existingEmployeeId) {
    logger.warn('⚠️ Employee ID already exists (tRPC)', {
      employeeId: input.employeeId,
      type: 'UNIFIED_REGISTER_TRPC_DUPLICATE_ID'
    });
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Employee ID already exists.',
    });
  }

  // Step 3: Check for duplicate emails
  const existingPersonalEmail = await checkEmployeeEmailExists(
    input.personalEmail,
    'personalEmail'
  );

  if (existingPersonalEmail) {
    logger.warn('⚠️ Personal email already exists (tRPC)', {
      email: input.personalEmail,
      type: 'UNIFIED_REGISTER_TRPC_DUPLICATE_EMAIL'
    });
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Personal email already exists.',
    });
  }

  const existingOfficialEmail = await checkEmployeeEmailExists(
    input.officialEmailId,
    'officialEmailId'
  );

  if (existingOfficialEmail) {
    logger.warn('⚠️ Official email already exists (tRPC)', {
      email: input.officialEmailId,
      type: 'UNIFIED_REGISTER_TRPC_DUPLICATE_EMAIL'
    });
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Official email already exists.',
    });
  }

    // Step 7: Check SuperUser authorization
    try {
      checkSuperUserAuthorization(userContext.role, input.role);
    } catch (error: any) {
      logger.warn('⚠️ Unauthorized attempt to create SuperUser (tRPC)', {
        requestedBy: userContext.email,
        requestedByRole: userContext.role,
        targetRole: input.role,
        type: 'UNIFIED_REGISTER_TRPC_SUPERUSER_FORBIDDEN'
      });
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: error.message,
      });
    }

    // Step 5: Encrypt sensitive fields
    logger.debug('🔐 Step 5: Encrypting sensitive employee data (tRPC)', {
      employeeId: input.employeeId,
      fields: ['panCardNumber', 'bankAccountNumber', 'aadhaarCardNumber', 'pfAccountNumber']
    });

    const encryptedInput = await encryptEmployeeSensitiveFields(input);

    // Step 6: Create employee + user
    try {
      const result = await unifiedRegisterEmployeeAndUser(encryptedInput, userContext.email);

    logger.info('✅ Unified registration successful (tRPC)', {
      employeeUuid: result.employeeUuid,
      userUuid: result.userUuid,
      employeeId: input.employeeId,
      role: input.role,
      createdBy: userContext.email,
      type: 'UNIFIED_REGISTER_TRPC_SUCCESS'
    });

    return {
      success: true,
      message: 'Employee and user registered successfully',
      data: {
        employeeUuid: result.employeeUuid,
        userUuid: result.userUuid,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error('💥 Unified registration error (tRPC)', {
      type: 'UNIFIED_REGISTER_TRPC_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Failed to register employee and user',
    });
  }
}
