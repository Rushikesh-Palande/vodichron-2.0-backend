/**
 * Customer Create Store
 * ====================
 * Database operations for creating and validating customer records
 * 
 * Responsibilities:
 * - Check for duplicate emails
 * - Insert customer data into database
 * - Generate UUID for new customer
 * - Handle date formatting
 * - Comprehensive logging and error handling
 */

import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { CreateCustomerInput } from '../../schemas/crud/create-customer.schemas';

/**
 * Check if Customer Email Exists
 * ==============================
 * Checks if an email already exists in the database
 * Used for validation before creating new customer
 * 
 * @param email - Email to check
 * @returns Customer record if exists, null otherwise
 */
export async function checkCustomerEmailExists(
  email: string
): Promise<{ uuid: string; name: string } | null> {
  const timer = new PerformanceTimer('checkCustomerEmailExists');
  
  try {
    logger.debug('🔍 Checking if customer email exists', {
      email,
      operation: 'checkCustomerEmailExists'
    });

    const sql = `
      SELECT uuid, name, email
      FROM customers
      WHERE email = :email
      LIMIT 1
    `;

    const result = await sequelize.query<{ uuid: string; name: string }>(sql, {
      replacements: { email },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('CHECK_CUSTOMER_EMAIL', email, duration);

    if (result.length > 0) {
      logger.debug('✅ Customer email found', {
        email,
        customerUuid: result[0].uuid,
        duration: `${duration}ms`
      });
      return result[0];
    }

    logger.debug('❌ Customer email not found', {
      email,
      duration: `${duration}ms`
    });
    return null;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('CHECK_CUSTOMER_EMAIL_ERROR', email, duration, error);
    
    logger.error('❌ Failed to check customer email', {
      email,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while checking customer email: ${error.message}`);
  }
}

/**
 * Insert Customer
 * ===============
 * Inserts a new customer record into the database
 * 
 * Process:
 * 1. Generate UUID for new customer
 * 2. Format current timestamp
 * 3. Build INSERT query with all fields
 * 4. Execute query with parameterized values
 * 5. Return the generated UUID
 * 
 * @param customerData - Customer data to insert
 * @param createdBy - UUID of user creating the customer
 * @returns UUID of the newly created customer
 */
export async function insertCustomer(
  customerData: CreateCustomerInput,
  createdBy: string
): Promise<string> {
  const timer = new PerformanceTimer('insertCustomer');
  
  try {
    // Generate UUID for new customer
    const customerUuid = uuidv4();
    const createdAt = moment().format('YYYY-MM-DD HH:mm:ss');

    logger.info('📝 Inserting new customer', {
      name: customerData.name,
      email: customerData.email,
      createdBy,
      operation: 'insertCustomer'
    });

    // Build INSERT SQL - preserving old logic
    const sql = `
      INSERT INTO customers (
        uuid,
        name,
        primaryContact,
        secondaryContact,
        email,
        country,
        timezone,
        status,
        createdBy,
        updatedBy,
        createdAt,
        updatedAt
      ) VALUES (
        :uuid,
        :name,
        :primaryContact,
        :secondaryContact,
        :email,
        :country,
        :timezone,
        :status,
        :createdBy,
        :updatedBy,
        :createdAt,
        :updatedAt
      )
    `;

    // Execute INSERT
    await sequelize.query(sql, {
      replacements: {
        uuid: customerUuid,
        name: customerData.name,
        primaryContact: customerData.primaryContact,
        secondaryContact: customerData.secondaryContact || null,
        email: customerData.email,
        country: customerData.country,
        timezone: customerData.timezone,
        status: customerData.status || 'ACTIVE',
        createdBy,
        updatedBy: createdBy,
        createdAt,
        updatedAt: createdAt,
      },
      type: QueryTypes.INSERT,
    });

    const duration = timer.end();
    logDatabase('INSERT_CUSTOMER', customerUuid, duration);

    logger.info('✅ Customer created successfully', {
      customerUuid,
      name: customerData.name,
      email: customerData.email,
      duration: `${duration}ms`
    });

    return customerUuid;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('INSERT_CUSTOMER_ERROR', 'new_customer', duration, error);
    
    logger.error('❌ Failed to insert customer', {
      name: customerData.name,
      email: customerData.email,
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      duration: `${duration}ms`,
      stack: error.stack
    });

    throw new Error(`Database error while creating customer: ${error.message}`);
  }
}
