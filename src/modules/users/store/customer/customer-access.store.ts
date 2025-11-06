/**
 * Customer App Access Store
 * ==========================
 * Database operations for customer application access.
 * 
 * Based on old backend: src/store/userStore.ts
 * 
 * Functions:
 * - getCustomerAppAccessByCustomerId - Check if customer has app access
 * - insertCustomerApplicationUser - Create customer app access
 * - reGenerateCustomerPassword - Regenerate customer password
 * - getCustomerById - Get customer details
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import CustomerAccess from '../../../../models/customer-access.model';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';

export interface CustomerAppAccess {
  uuid: string;
  customerId: string;
  password: string;
  status: string;
  lastLogin?: Date | null;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date | null;
}

export interface CustomerData {
  uuid: string;
  name: string;
  email: string;
  primaryContact?: string;
  secondaryContact?: string;
  country?: string;
  timezone?: string;
}

/**
 * Get Customer App Access By Customer ID
 * =======================================
 * Checks if customer already has application access.
 * 
 * Based on old backend: getCustomerAppAccessByCustomerId (userStore.ts lines 355-365)
 */
export async function getCustomerAppAccessByCustomerId(
  customerId: string
): Promise<CustomerAppAccess | null> {
  const timer = new PerformanceTimer('DB: getCustomerAppAccessByCustomerId');
  
  try {
    logger.debug('🔍 Checking customer app access', {
      customerId,
      operation: 'getCustomerAppAccessByCustomerId'
    });

    const result = await CustomerAccess.findOne({
      where: { customerId },
      raw: true
    });

    const duration = timer.end();
    logDatabase('SELECT', 'customer_app_access', duration, undefined, result ? 1 : 0);

    if (result) {
      logger.debug('✅ Customer app access found', {
        customerId,
        accessUuid: result.uuid,
        duration: `${duration}ms`
      });
    } else {
      logger.debug('⚠️ Customer app access not found', {
        customerId,
        duration: `${duration}ms`
      });
    }

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ getCustomerAppAccessByCustomerId failed', {
      customerId,
      error: error.message
    });
    logDatabase('SELECT', 'customer_app_access', duration, error);
    throw error;
  }
}

/**
 * Insert Customer Application User
 * =================================
 * Creates application access for a customer.
 * 
 * Based on old backend: insertCustomerApplicationUser (userStore.ts lines 304-334)
 */
export async function insertCustomerApplicationUser(
  data: {
    customerId: string;
    password: string;
  },
  createdBy: string
): Promise<string> {
  const timer = new PerformanceTimer('DB: insertCustomerApplicationUser');
  
  try {
    logger.info('➕ Creating customer app access', {
      customerId: data.customerId,
      operation: 'insertCustomerApplicationUser'
    });

    const result = await CustomerAccess.create({
      customerId: data.customerId,
      password: data.password,
      createdBy,
      updatedBy: createdBy,
      status: 'ACTIVE'
    });

    const duration = timer.end();
    logDatabase('INSERT', 'customer_app_access', duration, undefined, 1);

    logger.info('✅ Customer app access created successfully', {
      customerId: data.customerId,
      accessUuid: result.uuid,
      duration: `${duration}ms`
    });

    return result.uuid;

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ insertCustomerApplicationUser failed', {
      customerId: data.customerId,
      error: error.message
    });
    logDatabase('INSERT', 'customer_app_access', duration, error);
    throw new Error('Unable to add customer app access, try again after some time.');
  }
}

/**
 * Regenerate Customer Password
 * =============================
 * Updates customer password (for password reset/regeneration).
 * 
 * Based on old backend: reGenerateCustomerPassword (userStore.ts lines 336-347)
 */
export async function reGenerateCustomerPassword(
  customerId: string,
  hashedPassword: string,
  updatedBy: string
): Promise<void> {
  const timer = new PerformanceTimer('DB: reGenerateCustomerPassword');
  
  try {
    logger.info('🔒 Regenerating customer password', {
      customerId,
      operation: 'reGenerateCustomerPassword'
    });

    const [affectedRows] = await CustomerAccess.update(
      {
        password: hashedPassword,
        updatedBy,
        updatedAt: new Date()
      },
      {
        where: { customerId }
      }
    );

    const duration = timer.end();
    logDatabase('UPDATE', 'customer_app_access', duration, undefined, affectedRows);

    if (affectedRows === 0) {
      throw new Error('Customer app access not found');
    }

    logger.info('✅ Customer password regenerated successfully', {
      customerId,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ reGenerateCustomerPassword failed', {
      customerId,
      error: error.message
    });
    logDatabase('UPDATE', 'customer_app_access', duration, error);
    throw error;
  }
}

/**
 * Get Customer By ID
 * ==================
 * Fetches customer details by UUID.
 * 
 * Based on old backend: getCustomerById (customerStore.ts lines 6-16)
 */
export async function getCustomerById(customerId: string): Promise<CustomerData | null> {
  const timer = new PerformanceTimer('DB: getCustomerById');
  
  try {
    logger.debug('🔍 Fetching customer by ID', {
      customerId,
      operation: 'getCustomerById'
    });

    const sql = `
      SELECT 
        c.uuid,
        c.name,
        c.email,
        c.primaryContact,
        c.secondaryContact,
        c.country,
        c.timezone,
        IF(caa.customerId IS NOT NULL, TRUE, FALSE) AS hasAppAccess
      FROM customers c 
      LEFT JOIN customer_app_access caa ON c.uuid = caa.customerId
      WHERE c.uuid = ?
    `;

    const result = await sequelize.query<CustomerData>(sql, {
      replacements: [customerId],
      type: QueryTypes.SELECT,
      raw: true
    });

    const duration = timer.end();
    logDatabase('SELECT', 'customers', duration, undefined, result.length);

    if (result.length === 0) {
      logger.warn('⚠️ Customer not found', {
        customerId,
        duration: `${duration}ms`
      });
      return null;
    }

    logger.debug('✅ Customer fetched successfully', {
      customerId,
      customerName: result[0].name,
      duration: `${duration}ms`
    });

    return result[0];

  } catch (error: any) {
    const duration = timer.end();
    logger.error('❌ getCustomerById failed', {
      customerId,
      error: error.message
    });
    logDatabase('SELECT', 'customers', duration, error);
    throw error;
  }
}
