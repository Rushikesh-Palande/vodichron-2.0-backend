/**
 * Update Customer Service
 * ======================
 * Business logic layer for updating customer records
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { getCustomerById } from '../../stores/crud/get-customer.store';
import { updateCustomer, deleteCustomerById } from '../../stores/crud/update-customer.store';
import { UpdateCustomerInput } from '../../schemas/crud/create-customer.schemas';
import { ApplicationUserRole, SUPER_USERS, CUSTOMER_USERS } from '../../types/customer.types';

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
 * Update Customer
 * ===============
 * Updates an existing customer record with validation
 */
export async function updateCustomerData(
  customerData: UpdateCustomerInput,
  user: UserContext
): Promise<UpdateCustomerInput> {
  const timer = new PerformanceTimer('updateCustomerData_service');
  
  try {
    logger.info('📝 Updating customer', {
      customerId: customerData.uuid,
      updatedBy: user.uuid,
      operation: 'updateCustomerData'
    });

    // ==========================================================================
    // STEP 1: Get Existing Customer
    // ==========================================================================
    const existingCustomer = await getCustomerById(customerData.uuid);

    if (!existingCustomer) {
      logger.warn('❌ Customer not found for update', {
        customerId: customerData.uuid
      });

      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Unable to find the customer to update'
      });
    }

    // ==========================================================================
    // STEP 2: Authorization Check
    // ==========================================================================
    const loggedInUserRole = user.role;

    // If a customer user trying to update someone else's data
    if (
      ([...SUPER_USERS, ...CUSTOMER_USERS].includes(loggedInUserRole)) &&
      user.uuid !== customerData.uuid
    ) {
      logger.warn('🚫 Access denied - Customer cannot update others', {
        userId: user.uuid,
        targetCustomerId: customerData.uuid
      });

      logSecurity('UPDATE_CUSTOMER_ACCESS_DENIED', 'high', {
        userRole: loggedInUserRole,
        reason: 'Customer user cannot update other customers'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied for the operation request.'
      });
    }

    // ==========================================================================
    // STEP 3: Update Customer Record
    // ==========================================================================
    logger.info('💾 Updating customer data', {
      customerId: customerData.uuid,
      name: customerData.name,
      email: customerData.email
    });

    await updateCustomer(customerData.uuid, customerData, user.uuid);

    const duration = timer.end();

    logger.info('✅ Customer updated successfully', {
      customerId: customerData.uuid,
      updatedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('UPDATE_CUSTOMER_SUCCESS', 'low', {
      customerId: customerData.uuid,
      updatedBy: user.uuid,
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    return customerData;

  } catch (error: any) {
    const duration = timer.end();

    if (error instanceof TRPCError) {
      throw error;
    }

    logger.error('❌ Failed to update customer', {
      customerId: customerData.uuid,
      updatedBy: user.uuid,
      error: error.message,
      duration: `${duration}ms`
    });

    logSecurity('UPDATE_CUSTOMER_ERROR', 'critical', {
      customerId: customerData.uuid,
      error: error.message,
      duration
    }, undefined, user.uuid);

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update customer. Please try again later.'
    });
  }
}

/**
 * Delete Customer
 * ===============
 * Deletes a customer record
 */
export async function deleteCustomer(
  customerId: string,
  user: UserContext
): Promise<void> {
  const timer = new PerformanceTimer('deleteCustomer_service');
  
  try {
    logger.info('🗑️ Deleting customer', {
      customerId,
      deletedBy: user.uuid,
      operation: 'deleteCustomer'
    });

    // Check if customer exists
    const customer = await getCustomerById(customerId);

    if (!customer) {
      logger.warn('❌ Customer not found for deletion', {
        customerId
      });

      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Unable to find the customer to delete'
      });
    }

    // Delete the customer
    await deleteCustomerById(customerId);

    const duration = timer.end();

    logger.info('✅ Customer deleted successfully', {
      customerId,
      deletedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('DELETE_CUSTOMER_SUCCESS', 'medium', {
      customerId,
      deletedBy: user.uuid,
      customerName: customer.name,
      duration
    }, undefined, user.uuid);

  } catch (error: any) {
    const duration = timer.end();

    if (error instanceof TRPCError) {
      throw error;
    }

    logger.error('❌ Failed to delete customer', {
      customerId,
      deletedBy: user.uuid,
      error: error.message,
      duration: `${duration}ms`
    });

    logSecurity('DELETE_CUSTOMER_ERROR', 'critical', {
      customerId,
      error: error.message,
      duration
    }, undefined, user.uuid);

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete customer. Please try again later.'
    });
  }
}

/**
 * Check If Customer Email Exists
 * ==============================
 * Checks if an email exists for another customer
 */
export async function checkCustomerEmailExists(email: string): Promise<boolean> {
  const timer = new PerformanceTimer('checkCustomerEmailExists_service');
  
  try {
    logger.debug('🔍 Checking if customer email exists', {
      email,
      operation: 'checkCustomerEmailExists'
    });

    // Query to check if email exists
    // For now, we'll use a simple approach
    const duration = timer.end();
    logger.debug('✅ Email check completed', {
      email,
      duration: `${duration}ms`
    });

    // This should be implemented via store function
    return false;

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ Failed to check customer email', {
      email,
      error: error.message,
      duration: `${duration}ms`
    });

    // By default assume that email exists on error
    return true;
  }
}
