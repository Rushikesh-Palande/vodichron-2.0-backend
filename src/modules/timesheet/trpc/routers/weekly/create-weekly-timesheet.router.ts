/**
 * Create Weekly Timesheet tRPC Router
 * ====================================
 * Type-safe tRPC procedure for creating weekly timesheets
 */

import { protectedProcedure } from '../../../../../trpc/trpc';
import { logger } from '../../../../../utils/logger';
import { createWeeklyTimesheet } from '../../../services/weekly/create-weekly-timesheet.service';
import { ApplicationUserRole } from '../../../types/timesheet.types';
import { createWeeklyTimesheetInputSchema } from '../../../schemas/weekly/create.schemas';

/**
 * Create Weekly Timesheet Procedure
 * ==================================
 * tRPC mutation for creating a new weekly timesheet
 * 
 * Features:
 * - Protected route (requires authentication)
 * - Zod schema validation
 * - Email notifications to managers/directors/customers
 * - Task UUID generation
 * - Type-safe input/output
 * 
 * Access Control:
 * - Employees can only create their own timesheets
 * - Admin/HR/Super users can create timesheets for any employee
 * 
 * @input {timesheetData, employeeDetails}
 * @output { timesheetUuid: string, requestNumber: string }
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if validation fails or duplicate exists
 */
export const createWeeklyTimesheetProcedure = protectedProcedure
  .input(createWeeklyTimesheetInputSchema)
  .mutation(async ({ input, ctx }) => {
    logger.info('📥 Create weekly timesheet request received (tRPC)', {
      userId: ctx.user.uuid,
      userRole: ctx.user.role,
      employeeId: input.timesheetData.employeeId,
      weekStartDate: input.timesheetData.weekStartDate,
      operation: 'createWeeklyTimesheet_trpc'
    });

    // Extract user context
    const userContext = {
      uuid: ctx.user.uuid,
      role: ctx.user.role as ApplicationUserRole,
      email: ctx.user.email || '',
      name: ctx.user.email
    };

    // Call service layer
    const result = await createWeeklyTimesheet(
      input.timesheetData,
      input.employeeDetails,
      userContext
    );

    logger.info('✅ Weekly timesheet created successfully (tRPC)', {
      timesheetUuid: result.timesheetUuid,
      requestNumber: result.requestNumber,
      employeeId: input.timesheetData.employeeId,
      userId: ctx.user.uuid
    });

    return result;
  });
