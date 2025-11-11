/**
 * Create Daily Timesheet Service
 * ===============================
 * Business logic layer for creating daily timesheets
 * 
 * Based on old vodichron employeeTimesheetController.ts
 * 
 * Responsibilities:
 * - Authorization checks (employees can only create their own timesheets)
 * - Date overlap validation (prevent duplicate submissions)
 * - Task details validation
 * - Timesheet record creation
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import moment from 'moment';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { insertDailyTimesheet } from '../../stores/daily/create.store';
import { CreateDailyTimesheetInput } from '../../types/timesheet.types';
import { ApplicationUserRole } from '../../types/timesheet.types';
import { generateTaskId } from '../../helpers/generate-task-id';

/**
 * User Context Interface
 * ----------------------
 * Represents the authenticated user making the request
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Create Daily Timesheet Service
 * ===============================
 * 
 * Main service function for creating a new daily timesheet
 * 
 * Business Logic Flow:
 * 1. Authorization check (employees can only submit their own timesheets)
 * 2. Validate timesheet date
 * 3. Check for overlapping timesheets (prevent duplicates)
 * 4. Validate task details
 * 5. Insert timesheet record
 * 6. Return timesheet UUID
 * 
 * Authorization Rules:
 * - Employees can only create their own timesheets
 * - Admin/HR/Super users can create timesheets for any employee
 * 
 * @param timesheetData - Daily timesheet data from validated input
 * @param user - Authenticated user context
 * @returns UUID of the created timesheet
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if validation fails or duplicate exists
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export async function createDailyTimesheet(
  timesheetData: CreateDailyTimesheetInput,
  user: UserContext
): Promise<{ timesheetUuid: string }> {
  const timer = new PerformanceTimer('createDailyTimesheet_service');
  
  try {
    logger.info('📝 Creating daily timesheet', {
      employeeId: timesheetData.employeeId,
      timesheetDate: timesheetData.timesheetDate,
      totalHours: timesheetData.totalHours,
      createdBy: user.uuid,
      createdByRole: user.role,
      operation: 'createDailyTimesheet'
    });

    // ==========================================================================
    // STEP 1: Authorization Check
    // ==========================================================================
    const adminRoles = [
      ApplicationUserRole.superUser,
      ApplicationUserRole.admin,
      ApplicationUserRole.hr
    ];

    const isAdmin = adminRoles.includes(user.role);
    const isOwnTimesheet = user.uuid === timesheetData.employeeId;

    if (!isAdmin && !isOwnTimesheet) {
      logger.warn('🚫 Access denied - User cannot create timesheet for another employee', {
        userId: user.uuid,
        userRole: user.role,
        targetEmployeeId: timesheetData.employeeId
      });

      logSecurity('CREATE_DAILY_TIMESHEET_ACCESS_DENIED', 'high', {
        userRole: user.role,
        targetEmployeeId: timesheetData.employeeId,
        reason: 'Attempting to create timesheet for another employee'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only submit timesheets for yourself.'
      });
    }

    // ==========================================================================
    // STEP 2: Validate Timesheet Date
    // ==========================================================================
    const timesheetDate = moment(timesheetData.timesheetDate);
    
    if (!timesheetDate.isValid()) {
      logger.warn('❌ Invalid timesheet date', {
        timesheetDate: timesheetData.timesheetDate,
        userId: user.uuid
      });

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid timesheet date format. Please use YYYY-MM-DD.'
      });
    }

    // ==========================================================================
    // STEP 3: Task ID will ensure uniqueness (removed date overlap check)
    // ==========================================================================
    // Note: Multiple tasks can be submitted for the same date.
    // Each task gets a unique Task ID (TASK001, TASK002, etc.)
    // The Task ID is what's unique, not the date.

    // ==========================================================================
    // STEP 4: Validate Task Details
    // ==========================================================================
    if (!timesheetData.taskDetails || timesheetData.taskDetails.length === 0) {
      logger.warn('❌ No task details provided', {
        employeeId: timesheetData.employeeId,
        userId: user.uuid
      });

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Task details is a required field. Please add at least one task.'
      });
    }

    // ==========================================================================
    // STEP 5: Create Separate Row for Each Task
    // ==========================================================================
    logger.info('💾 Creating separate timesheet records for each task', {
      employeeId: timesheetData.employeeId,
      timesheetDate: timesheetData.timesheetDate,
      taskCount: timesheetData.taskDetails.length
    });

    const createdTimesheets: string[] = [];

    // Loop through each task and create a separate database row
    for (const taskDetail of timesheetData.taskDetails) {
      // Generate unique Task ID for this specific task
      logger.debug('🔢 Generating task ID for employee', {
        employeeId: timesheetData.employeeId
      });

      const taskId = await generateTaskId(timesheetData.employeeId);

      logger.info('✅ Task ID generated', {
        employeeId: timesheetData.employeeId,
        taskId
      });

      // Create timesheet data for this single task
      const singleTaskTimesheet: CreateDailyTimesheetInput = {
        ...timesheetData,
        taskId,
        // Use individual task fields instead of taskDetails array
        customer: taskDetail.customer || timesheetData.customer,
        project: taskDetail.project || timesheetData.project,
        manager: taskDetail.manager || timesheetData.manager,
        taskBrief: taskDetail.taskBrief || timesheetData.taskBrief,
        taskStatus: taskDetail.taskStatus || timesheetData.taskStatus,
        responsible: taskDetail.responsible || timesheetData.responsible,
        plannedStartDate: taskDetail.plannedStartDate || timesheetData.plannedStartDate,
        plannedEndDate: taskDetail.plannedEndDate || timesheetData.plannedEndDate,
        actualStartDate: taskDetail.actualStartDate || timesheetData.actualStartDate,
        actualEndDate: taskDetail.actualEndDate || timesheetData.actualEndDate,
        completionPercentage: taskDetail.completionPercentage ?? timesheetData.completionPercentage,
        remarks: taskDetail.remarks || timesheetData.remarks,
        reasonForDelay: taskDetail.reasonForDelay || timesheetData.reasonForDelay,
        taskHours: taskDetail.taskHours || timesheetData.taskHours,
        // Keep taskDetails array with single task
        taskDetails: [taskDetail],
        // TotalHours is not being used, set to 0
        totalHours: 0
      };

      // Insert this task as a separate row
      const timesheetUuid = await insertDailyTimesheet(singleTaskTimesheet, user.uuid);
      createdTimesheets.push(timesheetUuid);

      logger.info('✅ Task timesheet record created', {
        timesheetUuid,
        taskId,
        employeeId: timesheetData.employeeId
      });
    }

    // ==========================================================================
    // STEP 6: Log Success and Return
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Daily timesheets created successfully', {
      timesheetCount: createdTimesheets.length,
      timesheetUuids: createdTimesheets,
      employeeId: timesheetData.employeeId,
      timesheetDate: timesheetData.timesheetDate,
      createdBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('CREATE_DAILY_TIMESHEET_SUCCESS', 'low', {
      timesheetCount: createdTimesheets.length,
      employeeId: timesheetData.employeeId,
      duration
    }, undefined, user.uuid);

    // Return the first UUID for backward compatibility
    return { timesheetUuid: createdTimesheets[0] };

  } catch (error: any) {
    // ==========================================================================
    // STEP 8: Error Handling
    // ==========================================================================
    const duration = timer.end();

    // If it's already a TRPCError, re-throw it
    if (error instanceof TRPCError) {
      throw error;
    }

    // Log unexpected errors
    logger.error('❌ Failed to create daily timesheet', {
      employeeId: timesheetData.employeeId,
      timesheetDate: timesheetData.timesheetDate,
      createdBy: user.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('CREATE_DAILY_TIMESHEET_ERROR', 'critical', {
      employeeId: timesheetData.employeeId,
      error: error.message,
      duration
    }, undefined, user.uuid);

    // Throw generic error to avoid exposing internal details
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Problem submitting your timesheet at the moment, please try again after some time.'
    });
  }
}
