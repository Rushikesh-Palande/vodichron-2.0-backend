/**
 * Customer Get Store
 * =================
 * Database operations for retrieving customer records
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import { Customer, CustomerFilters } from '../../types/customer.types';

/**
 * Get Customer By ID
 * ==================
 * Retrieves a customer by UUID with app access information
 */
export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const timer = new PerformanceTimer('getCustomerById');
  
  try {
    logger.debug('🔍 Fetching customer by ID', {
      customerId,
      operation: 'getCustomerById'
    });

    const sql = `
      SELECT 
        c.*,
        IF(caa.customerId IS NOT NULL, TRUE, FALSE) AS hasAppAccess
      FROM customers c 
      LEFT JOIN customer_app_access caa ON c.uuid = caa.customerId
      WHERE c.uuid = :customerId
    `;

    const result = await sequelize.query<Customer>(sql, {
      replacements: { customerId },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('SELECT_CUSTOMER', customerId, duration);

    if (result.length > 0) {
      logger.debug('✅ Customer found', {
        customerId,
        name: result[0].name,
        duration: `${duration}ms`
      });
      return result[0];
    }

    logger.debug('❌ Customer not found', {
      customerId,
      duration: `${duration}ms`
    });
    return null;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('SELECT_CUSTOMER_ERROR', customerId, duration, error);
    
    logger.error('❌ Failed to fetch customer', {
      customerId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching customer: ${error.message}`);
  }
}

/**
 * Get Paginated Customer List
 * ============================
 * Retrieves paginated list of customers with optional filters
 */
export async function getPaginatedCustomerList(
  filters: CustomerFilters,
  page: number = 1,
  limit: number = 10
): Promise<Customer[]> {
  const timer = new PerformanceTimer('getPaginatedCustomerList');
  
  try {
    logger.debug('📊 Fetching paginated customer list', {
      filters,
      page,
      limit,
      operation: 'getPaginatedCustomerList'
    });

    const queryParams: any[] = [];
    const filterClauses: string[] = [];

    // Build filter clauses
    if (filters?.country) {
      filterClauses.push(`country = ?`);
      queryParams.push(filters.country);
    }

    if (filters?.status) {
      filterClauses.push(`status = ?`);
      queryParams.push(filters.status);
    }

    // Build WHERE clause
    const whereClause = filterClauses.length > 0 
      ? `WHERE ${filterClauses.join(' AND ')}`
      : '';

    // Add pagination
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    const sql = `
      SELECT *
      FROM customers  
      ${whereClause}
      ORDER BY customers.name ASC
      LIMIT ? OFFSET ?
    `;

    const result = await sequelize.query<Customer>(sql, {
      replacements: queryParams,
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('SELECT_CUSTOMERS_PAGINATED', `page_${page}`, duration);

    logger.debug('✅ Customers fetched successfully', {
      count: result.length,
      page,
      limit,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('SELECT_CUSTOMERS_ERROR', `page_${page}`, duration, error);
    
    logger.error('❌ Failed to fetch customers', {
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching customers: ${error.message}`);
  }
}

/**
 * Search All Customers By Keyword
 * ===============================
 * Searches customers by name or email with optional exclusion
 * Preserves old logic from customerStore.ts
 */
export async function searchAllCustomersByKeyword(
  keyword: string,
  excludedUsers: string[] = []
): Promise<any[]> {
  const timer = new PerformanceTimer('searchAllCustomersByKeyword');
  
  try {
    logger.debug('🔎 Searching customers by keyword', {
      keyword,
      excludedCount: excludedUsers.length,
      operation: 'searchAllCustomersByKeyword'
    });

    let sql = `
      SELECT c.uuid, c.email, c.name 
      FROM customers c
      WHERE (c.name LIKE ? OR c.email LIKE ?)
    `;

    const params = [`${keyword}%`, `${keyword}%`];

    // Add excluded users filter
    if (excludedUsers && excludedUsers.length > 0) {
      const placeholders = excludedUsers.map(() => '?').join(',');
      sql += ` AND c.uuid NOT IN (${placeholders})`;
      params.push(...excludedUsers);
    }

    sql += ` LIMIT 10`;

    const result = await sequelize.query<any>(sql, {
      replacements: params,
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('SEARCH_CUSTOMERS', keyword, duration);

    logger.debug('✅ Customers search completed', {
      keyword,
      resultCount: result.length,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('SEARCH_CUSTOMERS_ERROR', keyword, duration, error);
    
    logger.error('❌ Failed to search customers', {
      keyword,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while searching customers: ${error.message}`);
  }
}
