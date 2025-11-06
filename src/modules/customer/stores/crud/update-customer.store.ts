/**
 * Customer Update Store
 * ====================
 * Database operations for updating customer records
 */

import { QueryTypes } from 'sequelize';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { Customer } from '../../types/customer.types';

/**
 * Update Customer
 * ===============
 * Updates an existing customer record
 * Preserves old logic from customerStore.ts
 */
export async function updateCustomer(
  customerId: string,
  customerData: Partial<Customer>,
  updatedBy: string
): Promise<void> {
  const timer = new PerformanceTimer('updateCustomer');
  
  try {
    logger.info('📝 Updating customer', {
      customerId,
      updatedBy,
      operation: 'updateCustomer'
    });

    const updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');

    const sql = `
      UPDATE customers
      SET 
        name = ?,
        primaryContact = ?,
        secondaryContact = ?,
        country = ?,
        timezone = ?,
        status = ?,
        updatedAt = ?,
        updatedBy = ?
      WHERE uuid = ?
    `;

    await sequelize.query(sql, {
      replacements: [
        customerData.name,
        customerData.primaryContact,
        customerData.secondaryContact,
        customerData.country,
        customerData.timezone,
        customerData.status,
        updatedAt,
        updatedBy,
        customerId,
      ],
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_CUSTOMER', customerId, duration);

    logger.info('✅ Customer updated successfully', {
      customerId,
      updatedBy,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_CUSTOMER_ERROR', customerId, duration, error);
    
    logger.error('❌ Failed to update customer', {
      customerId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while updating customer: ${error.message}`);
  }
}

/**
 * Update Customer Password
 * =======================
 * Updates customer password (used in user store typically)
 */
export async function updateCustomerPassword(
  customerId: string,
  encryptedPassword: string
): Promise<void> {
  const timer = new PerformanceTimer('updateCustomerPassword');
  
  try {
    logger.info('🔐 Updating customer password', {
      customerId,
      operation: 'updateCustomerPassword'
    });

    const updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');

    const sql = `
      UPDATE application_users
      SET 
        password = ?,
        updatedAt = ?
      WHERE employeeId = ?
    `;

    await sequelize.query(sql, {
      replacements: [
        encryptedPassword,
        updatedAt,
        customerId,
      ],
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_CUSTOMER_PASSWORD', customerId, duration);

    logger.info('✅ Customer password updated successfully', {
      customerId,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_CUSTOMER_PASSWORD_ERROR', customerId, duration, error);
    
    logger.error('❌ Failed to update customer password', {
      customerId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while updating password: ${error.message}`);
  }
}

/**
 * Delete Customer
 * ===============
 * Deletes a customer record from database
 */
export async function deleteCustomerById(customerId: string): Promise<void> {
  const timer = new PerformanceTimer('deleteCustomerById');
  
  try {
    logger.warn('🗑️ Deleting customer', {
      customerId,
      operation: 'deleteCustomerById'
    });

    const sql = `DELETE FROM customers WHERE uuid = ?`;

    await sequelize.query(sql, {
      replacements: [customerId],
      type: QueryTypes.DELETE,
    });

    const duration = timer.end();
    logDatabase('DELETE_CUSTOMER', customerId, duration);

    logger.info('✅ Customer deleted successfully', {
      customerId,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('DELETE_CUSTOMER_ERROR', customerId, duration, error);
    
    logger.error('❌ Failed to delete customer', {
      customerId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while deleting customer: ${error.message}`);
  }
}
