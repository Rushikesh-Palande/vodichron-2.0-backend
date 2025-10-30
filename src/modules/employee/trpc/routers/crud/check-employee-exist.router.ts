/**
 * Check Employee Exist tRPC Router
 * =================================
 * Type-safe tRPC procedure for checking if employee email exists
 * Used for frontend form validation
 */

import { publicProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { checkEmployeeExistSchema } from '../../../schemas/crud/check-employee-exist.schemas';
import { checkEmployeeExist } from '../../../services/crud/check-employee-exist.service';

/**
 * Check Employee Exist Procedure
 * ==============================
 * tRPC query for checking if an employee email already exists
 * 
 * Features:
 * - Public route (no authentication required)
 * - Zod schema validation
 * - Type-safe input/output
 * - Used for real-time form validation
 * - Fail-safe: returns true on error to prevent duplicates
 * 
 * @input { email: string, emailType: 'personalEmail' | 'officialEmailId' }
 * @output { exists: boolean }
 */
export const checkEmployeeExistProcedure = publicProcedure
  .input(checkEmployeeExistSchema)
  .query(async ({ input }) => {
    logger.info('📥 Check employee exist request received (tRPC)', {
      email: input.email,
      emailType: input.emailType,
      operation: 'checkEmployeeExist_trpc'
    });

    const result = await checkEmployeeExist(input);

    logger.info('✅ Check employee exist completed (tRPC)', {
      email: input.email,
      exists: result.exists
    });

    return result;
  });
