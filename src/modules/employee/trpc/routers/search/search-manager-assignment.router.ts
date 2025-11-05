/**
 * Search Manager Assignment tRPC Router
 * ======================================
 * Type-safe tRPC procedure for searching employees for manager/director assignment
 * Provides end-to-end type safety from frontend to backend
 * 
 * Based on: old vodichron GET /employee/search/manager-assignment/list/:keyword
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { searchManagerAssignmentSchema } from '../../../schemas/search/search-manager-assignment.schemas';
import { searchForManagerAssignment } from '../../../services/search/search-manager-assignment.service';

/**
 * Search Manager Assignment Procedure
 * ====================================
 * tRPC query for searching employees suitable for manager/director roles
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Type-safe input/output
 * - Comprehensive logging
 * - Error handling
 * 
 * Use Cases:
 * - Employee registration form (select reporting manager)
 * - Employee registration form (select reporting director)
 * - Employee update form (change manager/director)
 * - Manager assignment workflows
 * 
 * Access Control:
 * - ADMIN_USERS can search for manager assignment (super_user, admin, hr)
 * - Used during employee creation/update flows
 * 
 * @input SearchManagerAssignmentInput - Search keyword and optional exclusions
 * @output SearchManagerAssignmentResult[] - Array of matching employees
 * @throws TRPCError UNAUTHORIZED if user not authenticated
 * @throws TRPCError BAD_REQUEST if validation fails
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export const searchManagerAssignmentProcedure = protectedProcedure
  .input(searchManagerAssignmentSchema)
  .query(async ({ input, ctx }) => {
    logger.info('🔍 Search manager assignment request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      keyword: input.keyword,
      excludedUsersCount: input.excludedUsers?.length || 0,
      operation: 'searchManagerAssignment_trpc'
    });

    // Call service layer
    const results = await searchForManagerAssignment(input);

    logger.info('✅ Manager assignment search completed (tRPC)', {
      resultsCount: results.length,
      userId: ctx.user.uuid,
      keyword: input.keyword
    });

    return results;
  });
