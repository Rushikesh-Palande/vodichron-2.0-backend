import { router } from '../../../trpc/trpc';
import { getMasterDataProcedure } from './routers/get-master-data.router';

/**
 * Vodichron HRMS Master Data tRPC Router
 * =======================================
 * Handles master data operations for the Vodichron HRMS system using tRPC.
 * 
 * Features:
 * - Type-safe API with automatic validation
 * - Role-based access control (RBAC)
 * - Comprehensive logging and audit trail
 * - Performance monitoring
 * 
 * Procedures:
 * - get: Fetch all master data configuration (designation, department, etc.)
 */
export const masterDataRouter = router({
  get: getMasterDataProcedure,
});
