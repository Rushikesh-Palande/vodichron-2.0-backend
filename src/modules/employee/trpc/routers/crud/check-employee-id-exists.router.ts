/**
 * Check Employee ID Exists tRPC Router
 * =====================================
 * Type-safe tRPC procedure for checking if employee ID exists
 * Used for real-time frontend form validation
 */

import { publicProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { checkEmployeeIdExistsSchema } from '../../../schemas/crud/check-employee-id-exists.schemas';
import { checkEmployeeIdExistsService } from '../../../services/crud/check-employee-id-exists.service';

/**
 * Check Employee ID Exists Procedure
 * ===================================
 * tRPC query for checking if an employee ID already exists
 * 
 * Features:
 * - Public route (no authentication required for form validation)
 * - Zod schema validation
 * - Type-safe input/output
 * - Used for real-time form validation
 * - Fail-safe: returns true on error to prevent duplicates
 * 
 * @input { employeeId: string }
 * @output { exists: boolean }
 */
export const checkEmployeeIdExistsProcedure = publicProcedure
  .input(checkEmployeeIdExistsSchema)
  .query(async ({ input }) => {
    logger.info('\ud83d\udcE5 Check employee ID exists request received (tRPC)', {
      employeeId: input.employeeId,
      operation: 'checkEmployeeIdExists_trpc'
    });

    const result = await checkEmployeeIdExistsService(input);

    logger.info('\u2705 Check employee ID exists completed (tRPC)', {
      employeeId: input.employeeId,
      exists: result.exists
    });

    return result;
  });
