/**
 * Customer tRPC Router Index
 * =========================
 * 
 * Combines all customer-related tRPC procedures into a single router.
 * Provides a unified interface for all customer operations.
 * 
 * Procedures:
 * - customer.create - Create new customer
 * - customer.getById - Get customer by ID
 * - customer.list - Get paginated customers list
 * - customer.search - Search customers by keyword
 * - customer.update - Update customer details
 * - customer.delete - Delete customer
 */

import { router } from '../../../trpc/trpc';
import { createCustomerProcedure } from './routers/crud/create-customer.router';
import {
  getCustomerByIdProcedure,
  getCustomersListProcedure,
  searchCustomersProcedure,
} from './routers/crud/get-customer.router';
import {
  updateCustomerProcedure,
  deleteCustomerProcedure,
} from './routers/crud/update-customer.router';

/**
 * Customer Router
 * ==============
 * Aggregates all customer procedures
 */
export const customerRouter = router({
  // CREATE Operations
  create: createCustomerProcedure,

  // READ Operations
  getById: getCustomerByIdProcedure,
  list: getCustomersListProcedure,
  search: searchCustomersProcedure,

  // UPDATE Operations
  update: updateCustomerProcedure,

  // DELETE Operations
  delete: deleteCustomerProcedure,
});

/**
 * Export type for frontend integration
 */
export type CustomerRouter = typeof customerRouter;
