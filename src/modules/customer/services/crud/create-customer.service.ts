/**
 * Create Customer Service
 * ======================
 * Business logic layer for creating new customers
 * 
 * Responsibilities:
 * - Authorization checks (only admin/super user can create customers)
 * - Email duplication validation
 * - Customer record creation
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { checkCustomerEmailExists, insertCustomer } from '../../stores/crud/create-customer.store';
import { CreateCustomerInput } from '../../schemas/crud/create-customer.schemas';
import { ApplicationUserRole } from '../../types/customer.types';

/**
 * User Context Interface
 * ----------------------
 * Represents the authenticated user making the request
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Create Customer Service
 * =======================
 * 
 * Main service function for creating a new customer
 * 
 * Business Logic Flow:
 * 1. Authorization check (only admin/super_user)
 * 2. Validate email uniqueness
 * 3. Insert customer record
 * 4. Return customer UUID
 * 
 * @param customerData - Customer data from validated input
 * @param user - Authenticated user context
 * @returns UUID of the created customer
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if email already exists
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export async function createCustomer(
  customerData: CreateCustomerInput,
  user: UserContext
): Promise<{ customerUuid: string }> {
  const timer = new PerformanceTimer('createCustomer_service');
  
  try {
    logger.info('👤 Creating new customer', {
      name: customerData.name,
      email: customerData.email,
      createdBy: user.uuid,
      createdByRole: user.role,
      operation: 'createCustomer'
    });

    // ==========================================================================
    // STEP 1: Authorization Check
    // ==========================================================================
    const allowedRoles = [
      ApplicationUserRole.superUser,
      ApplicationUserRole.admin,
    ];

    if (!allowedRoles.includes(user.role)) {
      logger.warn('🚫 Access denied - User not authorized to create customer', {
        userId: user.uuid,
        userRole: user.role
      });

      logSecurity('CREATE_CUSTOMER_ACCESS_DENIED', 'high', {
        userRole: user.role,
        reason: 'Insufficient permissions'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to create customers. Contact Admin.'
      });
    }

    // ==========================================================================
    // STEP 2: Check Email Uniqueness
    // ==========================================================================
    logger.debug('📧 Checking email uniqueness', {
      email: customerData.email
    });

    const emailExists = await checkCustomerEmailExists(customerData.email);

    if (emailExists) {
      logger.warn('❌ Email already exists', {
        email: customerData.email,
        existingCustomer: emailExists.uuid
      });

      logSecurity('CREATE_CUSTOMER_DUPLICATE_EMAIL', 'medium', {
        email: customerData.email
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Customer with email ${customerData.email} already exists.`
      });
    }

    // ==========================================================================
    // STEP 3: Insert Customer Record
    // ==========================================================================
    logger.info('💾 Inserting customer record', {
      name: customerData.name,
      email: customerData.email
    });

    const customerUuid = await insertCustomer(customerData, user.uuid);

    logger.info('✅ Customer record created', {
      customerUuid,
      name: customerData.name,
      email: customerData.email
    });

    // ==========================================================================
    // STEP 4: Success - Log and Return
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Customer created successfully', {
      customerUuid,
      name: customerData.name,
      email: customerData.email,
      createdBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('CREATE_CUSTOMER_SUCCESS', 'low', {
      customerUuid,
      name: customerData.name,
      email: customerData.email,
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    return { customerUuid };

  } catch (error: any) {
    // ==========================================================================
    // STEP 5: Error Handling
    // ==========================================================================
    const duration = timer.end();

    // If it's already a TRPCError, re-throw it
    if (error instanceof TRPCError) {
      throw error;
    }

    // Log unexpected errors
    logger.error('❌ Failed to create customer', {
      name: customerData.name,
      email: customerData.email,
      createdBy: user.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('CREATE_CUSTOMER_ERROR', 'critical', {
      name: customerData.name,
      email: customerData.email,
      error: error.message,
      duration
    }, undefined, user.uuid);

    // Throw generic error to avoid exposing internal details
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create customer. Please try again later.'
    });
  }
}
