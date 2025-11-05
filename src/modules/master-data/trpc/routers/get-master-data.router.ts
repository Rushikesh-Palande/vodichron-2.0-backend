/**
 * Get Master Data tRPC Router
 * ============================
 * Type-safe tRPC procedure for fetching master data configuration
 * Provides end-to-end type safety from frontend to backend
 * 
 * Based on: old vodichron GET /common-data/master
 */

import { protectedProcedure } from '../../../../trpc/trpc';
import { logger } from '../../../../utils/logger';
import { getMasterDataSchema } from '../../schemas/get-master-data.schemas';
import { getMasterData } from '../../services/get-master-data.service';

/**
 * Get Master Data Procedure
 * ==========================
 * tRPC query for fetching all master data configuration
 * 
 * Features:
 * - Protected route (requires authentication)
 * - No input validation needed (simple GET)
 * - Type-safe output
 * - Comprehensive logging
 * - Error handling
 * 
 * Use Cases:
 * - Employee registration form (designation, department dropdowns)
 * - Leave application form (leave type dropdown)
 * - Any form requiring system configuration data
 * - Frontend typically caches this data after first fetch
 * 
 * Access Control:
 * - ADMIN_USERS and EMP_MANAGERS can access
 * - Used by HR, admins, and managers for various forms
 * 
 * @input Empty object (no parameters needed)
 * @output MasterField[] - Array of master data fields
 * @throws TRPCError UNAUTHORIZED if user not authenticated
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const getMasterDataProcedure = protectedProcedure
  .input(getMasterDataSchema)
  .query(async ({ ctx }) => {
    logger.info('📋 Get master data request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      operation: 'getMasterData_trpc'
    });

    // Call service layer
    const masterFields = await getMasterData();

    logger.info('✅ Master data retrieved successfully (tRPC)', {
      fieldsCount: masterFields.length,
      fieldNames: masterFields.map(f => f.name),
      userId: ctx.user.uuid
    });

    return masterFields;
  });
