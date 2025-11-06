/**
 * Get Customer tRPC Router
 * =======================
 * Type-safe tRPC procedures for retrieving customer records
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { z } from 'zod';
import { getCustomerDetails, getPaginatedCustomers, searchCustomers } from '../../../services/crud/get-customer.service';
import { CustomerListFilterSchema, CustomerSearchSchema } from '../../../schemas/crud/create-customer.schemas';

/**
 * Get Customer By ID Procedure
 */
export const getCustomerByIdProcedure = protectedProcedure
  .input(z.object({ customerId: z.string().uuid() }))
  .query(async ({ input, ctx }) => {
    logger.info('📥 Get customer request received (tRPC)', {
      customerId: input.customerId,
      userId: ctx.user.uuid,
      operation: 'getCustomerById_trpc'
    });

    const customer = await getCustomerDetails(input.customerId);

    logger.info('✅ Customer retrieved successfully (tRPC)', {
      customerId: input.customerId,
      userId: ctx.user.uuid
    });

    return customer;
  });

/**
 * Get Paginated Customers List Procedure
 */
export const getCustomersListProcedure = protectedProcedure
  .input(z.object({
    pagination: z.object({
      page: z.number().int().positive().optional().default(1),
      pageLimit: z.number().int().positive().max(100).optional().default(10),
    }),
    filters: CustomerListFilterSchema.partial().optional(),
  }))
  .query(async ({ input, ctx }) => {
    logger.info('📥 Get customers list request received (tRPC)', {
      page: input.pagination.page,
      pageLimit: input.pagination.pageLimit,
      filters: input.filters,
      userId: ctx.user.uuid,
      operation: 'getCustomersList_trpc'
    });

    const customers = await getPaginatedCustomers(
      input.filters || {},
      input.pagination.page,
      input.pagination.pageLimit
    );

    logger.info('✅ Customers list retrieved successfully (tRPC)', {
      count: customers.length,
      userId: ctx.user.uuid
    });

    return customers;
  });

/**
 * Search Customers Procedure
 */
export const searchCustomersProcedure = protectedProcedure
  .input(CustomerSearchSchema)
  .query(async ({ input, ctx }) => {
    logger.info('📥 Search customers request received (tRPC)', {
      keyword: input.keyword,
      userId: ctx.user.uuid,
      operation: 'searchCustomers_trpc'
    });

    // Add current user to excluded list
    const excludedUserIds = [...(input.exclude || []), ctx.user.uuid];

    const results = await searchCustomers(input.keyword, excludedUserIds);

    logger.info('✅ Customer search completed successfully (tRPC)', {
      keyword: input.keyword,
      resultCount: results.length,
      userId: ctx.user.uuid
    });

    return results;
  });
