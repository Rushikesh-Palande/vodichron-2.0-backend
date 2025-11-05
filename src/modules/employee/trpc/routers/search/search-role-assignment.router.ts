/**
 * Search Role Assignment tRPC Router
 * ==================================
 * 
 * Type-safe tRPC procedure for searching employees for role assignment.
 * Based on: old vodichron searchEmployeeForRoleAssignment controller (lines 188-202)
 * 
 * Pattern:
 * tRPC Router → Service (business logic) → Store (database)
 * 
 * Procedure Type: Query (reads data)
 * 
 * Input Schema: searchRoleAssignmentSchema (Zod validation)
 * Output Schema: searchRoleAssignmentOutputSchema
 * 
 * Usage (Frontend):
 * ```typescript
 * const results = await trpc.employee.searchRoleAssignment.query({
 *   keyword: "john",
 *   excludedUsers: ["uuid1", "uuid2"]
 * });
 * ```
 * 
 * Authorization:
 * - User must be authenticated (protectedProcedure)
 * - No role restrictions (all authenticated users can search)
 * 
 * Special Feature:
 * - Returns only employees WITHOUT roles (NOT EXISTS check in SQL)
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { searchRoleAssignmentSchema, searchRoleAssignmentOutputSchema } from '../../../schemas/search/search-role-assignment.schemas';
import { searchForRoleAssignment } from '../../../services/search/search-role-assignment.service';

/**
 * Search Role Assignment Procedure
 * ================================
 * 
 * tRPC query procedure for searching employees for role assignment.
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Type-safe input/output
 * - Comprehensive logging
 * - No role restrictions
 * - Returns only employees without roles
 * 
 * Access Control:
 * - Any authenticated user can search
 * 
 * Example:
 * ```typescript
 * await trpc.employee.searchRoleAssignment.query({
 *   keyword: "john",
 *   excludedUsers: ["uuid-to-exclude"]
 * });
 * ```
 * 
 * @input SearchRoleAssignmentInput - { keyword, excludedUsers }
 * @output Array of employees without roles (max 10)
 */
export const searchRoleAssignmentProcedure = protectedProcedure
  .input(searchRoleAssignmentSchema)
  .output(searchRoleAssignmentOutputSchema)
  .query(async ({ input, ctx }) => {
    logger.info('📥 Search role assignment request received (tRPC)', {
      keyword: input.keyword,
      excludedCount: input.excludedUsers?.length || 0,
      userId: ctx.user.uuid,
      operation: 'searchRoleAssignment_trpc'
    });

    // Extract user context from tRPC context
    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role,
      email: ctx.user.email || ''
    };

    // Call service layer
    const results = await searchForRoleAssignment(input, userContext);

    logger.info('✅ Role assignment search completed successfully (tRPC)', {
      keyword: input.keyword,
      resultCount: results.length,
      description: 'Employees without roles',
      userId: ctx.user.uuid
    });

    return results;
  });
