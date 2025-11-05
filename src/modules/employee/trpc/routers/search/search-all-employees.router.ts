/**
 * Search All Employees tRPC Router
 * ================================
 * 
 * Type-safe tRPC procedure for general employee search.
 * Based on: old vodichron searchEmployeeByKeyword controller (lines 173-186)
 * 
 * Pattern:
 * tRPC Router → Service (business logic) → Store (database)
 * 
 * Procedure Type: Query (reads data)
 * 
 * Input Schema: searchAllEmployeesSchema (Zod validation)
 * Output Schema: searchAllEmployeesOutputSchema
 * 
 * Usage (Frontend):
 * ```typescript
 * const results = await trpc.employee.searchAll.query({
 *   keyword: "john",
 *   excludedUsers: ["uuid1", "uuid2"]
 * });
 * ```
 * 
 * Authorization:
 * - User must be authenticated (protectedProcedure)
 * - No role restrictions (all authenticated users can search)
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { searchAllEmployeesSchema, searchAllEmployeesOutputSchema } from '../../../schemas/search/search-all-employees.schemas';
import { searchAllEmployees } from '../../../services/search/search-all-employees.service';

/**
 * Search All Employees Procedure
 * ==============================
 * 
 * tRPC query procedure for searching employees by keyword.
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Type-safe input/output
 * - Comprehensive logging
 * - No role restrictions
 * 
 * Access Control:
 * - Any authenticated user can search
 * 
 * Example:
 * ```typescript
 * await trpc.employee.searchAll.query({
 *   keyword: "john",
 *   excludedUsers: ["uuid-to-exclude"]
 * });
 * ```
 * 
 * @input SearchAllEmployeesInput - { keyword, excludedUsers }
 * @output Array of employee search results (max 10)
 */
export const searchAllEmployeesProcedure = protectedProcedure
  .input(searchAllEmployeesSchema)
  .output(searchAllEmployeesOutputSchema)
  .query(async ({ input, ctx }) => {
    logger.info('📥 Search all employees request received (tRPC)', {
      keyword: input.keyword,
      excludedCount: input.excludedUsers?.length || 0,
      userId: ctx.user.uuid,
      operation: 'searchAllEmployees_trpc'
    });

    // Extract user context from tRPC context
    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role,
      email: ctx.user.email || ''
    };

    // Call service layer
    const results = await searchAllEmployees(input, userContext);

    logger.info('✅ Employee search completed successfully (tRPC)', {
      keyword: input.keyword,
      resultCount: results.length,
      userId: ctx.user.uuid
    });

    return results;
  });
