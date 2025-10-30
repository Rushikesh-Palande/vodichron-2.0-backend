import { router } from '../../../trpc/trpc';
import { getByIdProcedure } from './routers/crud/get-by-id.router';
import { listProcedure } from './routers/crud/list.router';
import { createEmployeeProcedure } from './routers/crud/create.router';

/**
 * Vodichron HRMS Employee tRPC Router
 * ===================================
 * Handles employee-related operations for the Vodichron HRMS system using tRPC.
 * 
 * Features:
 * - Type-safe API with automatic validation
 * - Role-based access control (RBAC)
 * - Comprehensive logging and audit trail
 * - Performance monitoring
 * - Sensitive data encryption/decryption
 * 
 * Procedures:
 * - getById: Fetch employee profile by UUID
 * - list: Fetch paginated list of employees with filters
 * - create: Create a new employee record
 */
export const employeeRouter = router({
  getById: getByIdProcedure,
  list: listProcedure,
  create: createEmployeeProcedure,
});
