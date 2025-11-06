/**
 * Get Customer Service
 * ===================
 * Business logic layer for retrieving customer records
 */

import { TRPCError } from '@trpc/server';
import { logger, PerformanceTimer } from '../../../../utils/logger';
import { getCustomerById, getPaginatedCustomerList, searchAllCustomersByKeyword } from '../../stores/crud/get-customer.store';
import { Customer, CustomerFilters } from '../../types/customer.types';

/**
 * Get Customer Details By ID
 * =========================
 * Retrieves a customer's details by their UUID
 */
export async function getCustomerDetails(customerId: string): Promise<Customer> {
  const timer = new PerformanceTimer('getCustomerDetails_service');
  
  try {
    logger.debug('🔍 Fetching customer details', {
      customerId,
      operation: 'getCustomerDetails'
    });

    const customer = await getCustomerById(customerId);

    if (!customer) {
      logger.warn('❌ Customer not found', {
        customerId
      });

      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Unable to find the customer details'
      });
    }

    const duration = timer.end();
    logger.debug('✅ Customer details retrieved', {
      customerId,
      name: customer.name,
      duration: `${duration}ms`
    });

    return customer;

  } catch (error: any) {
    const duration = timer.end();

    if (error instanceof TRPCError) {
      throw error;
    }

    logger.error('❌ Failed to get customer details', {
      customerId,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve customer details. Please try again later.'
    });
  }
}

/**
 * Get Paginated Customers List
 * ============================
 * Retrieves a paginated list of customers with optional filters
 */
export async function getPaginatedCustomers(
  filters: CustomerFilters,
  page: number = 1,
  pageLimit: number = 10
): Promise<Customer[]> {
  const timer = new PerformanceTimer('getPaginatedCustomers_service');
  
  try {
    logger.debug('📊 Fetching paginated customers', {
      filters,
      page,
      pageLimit,
      operation: 'getPaginatedCustomers'
    });

    const customers = await getPaginatedCustomerList(filters, page, pageLimit);

    const duration = timer.end();
    logger.debug('✅ Customers list retrieved', {
      count: customers.length,
      page,
      pageLimit,
      duration: `${duration}ms`
    });

    return customers;

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to fetch customers', {
      error: error.message,
      duration: `${duration}ms`
    });

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to retrieve customers list. Please try again later.'
    });
  }
}

/**
 * Search Customers By Keyword
 * ===========================
 * Searches for customers by name or email
 */
export async function searchCustomers(
  keyword: string,
  excludedUserIds: string[] = []
): Promise<any[]> {
  const timer = new PerformanceTimer('searchCustomers_service');
  
  try {
    logger.debug('🔎 Searching customers', {
      keyword,
      excludedCount: excludedUserIds.length,
      operation: 'searchCustomers'
    });

    const results = await searchAllCustomersByKeyword(keyword, excludedUserIds);

    const duration = timer.end();
    logger.debug('✅ Customer search completed', {
      keyword,
      resultCount: results.length,
      duration: `${duration}ms`
    });

    return results;

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to search customers', {
      keyword,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to search customers. Please try again later.'
    });
  }
}
