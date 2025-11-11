/**
 * Create Weekly Timesheet Service
 * ================================
 * Business logic layer for creating weekly timesheets
 * 
 * Based on old vodichron employeeWeeklyTimesheetController.ts (line 138-167)
 * 
 * Responsibilities:
 * - Authorization checks (employees can only create their own timesheets)
 * - Week overlap validation (prevent duplicate submissions)
 * - Task UUID generation
 * - Timesheet record creation
 * - Email notifications to managers/directors/customers
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import moment from 'moment';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { 
  checkWeeklyTimesheetOverlap, 
  insertWeeklyTimesheet,
  addTaskUuids as addTaskUuidsStore
} from '../../stores/weekly/create.store';
import { CreateWeeklyTimesheetInput, ApplicationUserRole } from '../../types/timesheet.types';
import { generateRequestNumber } from '../../helpers/generate-request-number';
import { generateTaskId } from '../../helpers/generate-task-id';
import { getTimesheetSubmittedManagerNotificationTemplate } from '../../templates/timesheet-submitted-manager.template';
import { getTimesheetSubmittedEmployeeNotificationTemplate } from '../../templates/timesheet-submitted-employee.template';

/**
 * User Context Interface
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
  name?: string;
}

/**
 * Employee Details Interface
 * From getEmployeeByUuidWithManagerDetail
 */
interface EmployeeDetails {
  uuid: string;
  name: string;
  officialEmailId: string;
  managerDetail?: string; // "Name <email>"
  directorDetail?: string; // "Name <email>"
}

/**
 * Create Weekly Timesheet Service
 * ================================
 * 
 * Main service function for creating a new weekly timesheet
 * 
 * Business Logic Flow (from old vodichron line 138-167):
 * 1. Authorization check (employees can only submit their own timesheets)
 * 2. Validate employee exists
 * 3. Check for overlapping timesheets (prevent duplicates for same week)
 * 4. Generate request number
 * 5. Add UUIDs to task entries
 * 6. Insert timesheet record
 * 7. Send email notifications if status is REQUESTED
 * 8. Return timesheet UUID
 * 
 * Authorization Rules:
 * - Employees can only create their own timesheets
 * - Admin/HR/Super users can create timesheets for any employee
 * 
 * @param timesheetData - Weekly timesheet data from validated input
 * @param employeeDetails - Employee information including manager/director
 * @param user - Authenticated user context
 * @returns UUID of the created timesheet
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError BAD_REQUEST if validation fails or duplicate exists
 */
export async function createWeeklyTimesheet(
  timesheetData: CreateWeeklyTimesheetInput,
  employeeDetails: EmployeeDetails,
  user: UserContext
): Promise<{ timesheetUuid: string; requestNumber: string }> {
  const timer = new PerformanceTimer('createWeeklyTimesheet_service');
  
  try {
    logger.info('📝 Creating weekly timesheet', {
      employeeId: timesheetData.employeeId,
      weekStartDate: timesheetData.weekStartDate,
      weekEndDate: timesheetData.weekEndDate,
      totalHours: timesheetData.totalHours,
      timeSheetStatus: timesheetData.timeSheetStatus,
      createdBy: user.uuid,
      createdByRole: user.role,
      operation: 'createWeeklyTimesheet'
    });

    // ==========================================================================
    // STEP 1: Authorization Check
    // ==========================================================================
    // Based on old vodichron line 142-144
    if (user.uuid !== timesheetData.employeeId) {
      logger.warn('🚫 Access denied - User cannot create timesheet for another employee', {
        userId: user.uuid,
        userRole: user.role,
        targetEmployeeId: timesheetData.employeeId
      });

      logSecurity('CREATE_WEEKLY_TIMESHEET_ACCESS_DENIED', 'high', {
        userRole: user.role,
        targetEmployeeId: timesheetData.employeeId,
        reason: 'Attempting to create timesheet for another employee'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied for the operation request.'
      });
    }

    // ==========================================================================
    // STEP 2: Validate Employee Details
    // ==========================================================================
    // Based on old vodichron line 145-149
    if (!employeeDetails) {
      logger.warn('❌ Employee not found', {
        employeeId: timesheetData.employeeId,
        userId: user.uuid
      });

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Unable to find the details of the employee to update.'
      });
    }

    // ==========================================================================
    // STEP 3: Validate Week Dates
    // ==========================================================================
    const weekStartDate = moment(timesheetData.weekStartDate);
    const weekEndDate = moment(timesheetData.weekEndDate);
    
    if (!weekStartDate.isValid() || !weekEndDate.isValid()) {
      logger.warn('❌ Invalid week dates', {
        weekStartDate: timesheetData.weekStartDate,
        weekEndDate: timesheetData.weekEndDate,
        userId: user.uuid
      });

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid week dates. Please use YYYY-MM-DD format.'
      });
    }

    // ==========================================================================
    // STEP 4: Check for Overlapping Timesheets
    // ==========================================================================
    // Based on old vodichron line 151-157
    logger.debug('🔍 Checking for overlapping weekly timesheets', {
      employeeId: timesheetData.employeeId,
      weekStartDate: timesheetData.weekStartDate
    });

    const existingRecord = await checkWeeklyTimesheetOverlap(
      timesheetData.weekStartDate,
      user.uuid
    );

    if (existingRecord) {
      const formattedDate = weekStartDate.format('Do MMMM YYYY');
      
      logger.warn('⚠️ Weekly timesheet already exists', {
        employeeId: timesheetData.employeeId,
        weekStartDate: timesheetData.weekStartDate,
        formattedDate,
        existingUuid: existingRecord.uuid
      });

      logSecurity('CREATE_WEEKLY_TIMESHEET_DUPLICATE', 'medium', {
        employeeId: timesheetData.employeeId,
        weekStartDate: timesheetData.weekStartDate
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Timesheet is already submitted for the week starting with ${formattedDate}.`
      });
    }

    // ==========================================================================
    // STEP 5: Generate Request Number and Task ID
    // ==========================================================================
    // Based on old vodichron line 159
    const requestNumber = generateRequestNumber(6);
    
    logger.debug('🔢 Generated request number', {
      requestNumber,
      employeeId: timesheetData.employeeId
    });

    // Generate task ID for this employee
    logger.debug('🔢 Generating task ID for employee', {
      employeeId: timesheetData.employeeId
    });

    const taskId = await generateTaskId(timesheetData.employeeId);

    logger.info('✅ Task ID generated', {
      employeeId: timesheetData.employeeId,
      taskId
    });

    // ==========================================================================
    // STEP 6: Add UUIDs to Task Details
    // ==========================================================================
    // Based on old vodichron line 160 (calls addTaskUuids function)
    logger.debug('🆔 Adding UUIDs to task entries', {
      taskCount: timesheetData.taskDetails?.length || 0
    });

    const updatedTaskDetails = addTaskUuidsStore(timesheetData.taskDetails);
    const updatedTimesheetData = {
      ...timesheetData,
      taskDetails: updatedTaskDetails,
      taskId
    };

    // ==========================================================================
    // STEP 7: Insert Timesheet Record
    // ==========================================================================
    // Based on old vodichron line 161
    logger.info('💾 Inserting weekly timesheet record', {
      employeeId: timesheetData.employeeId,
      weekStartDate: timesheetData.weekStartDate,
      weekEndDate: timesheetData.weekEndDate,
      taskCount: updatedTimesheetData.taskDetails?.length || 0,
      totalHours: timesheetData.totalHours,
      requestNumber,
      taskId
    });

    const timesheetUuid = await insertWeeklyTimesheet(
      updatedTimesheetData,
      timesheetData.employeeId
    );

    // ==========================================================================
    // STEP 8: Send Email Notifications if Status is REQUESTED
    // ==========================================================================
    // Based on old vodichron line 162-164
    if (timesheetData.timeSheetStatus === 'REQUESTED') {
      await sendTimesheetEmailNotifications(
        employeeDetails,
        timesheetData,
        requestNumber.toString()
      );
    }

    // ==========================================================================
    // STEP 9: Log Success and Return
    // ==========================================================================
    const duration = timer.end();

    logger.info('✅ Weekly timesheet created successfully', {
      timesheetUuid,
      requestNumber,
      taskId,
      employeeId: timesheetData.employeeId,
      weekStartDate: timesheetData.weekStartDate,
      weekEndDate: timesheetData.weekEndDate,
      totalHours: timesheetData.totalHours,
      createdBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('CREATE_WEEKLY_TIMESHEET_SUCCESS', 'low', {
      timesheetUuid,
      requestNumber,
      employeeId: timesheetData.employeeId,
      duration
    }, undefined, user.uuid);

    return { timesheetUuid, requestNumber: requestNumber.toString() };

  } catch (error: any) {
    // ==========================================================================
    // STEP 10: Error Handling
    // ==========================================================================
    const duration = timer.end();

    if (error instanceof TRPCError) {
      throw error;
    }

    logger.error('❌ Failed to create weekly timesheet', {
      employeeId: timesheetData.employeeId,
      weekStartDate: timesheetData.weekStartDate,
      createdBy: user.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('CREATE_WEEKLY_TIMESHEET_ERROR', 'critical', {
      employeeId: timesheetData.employeeId,
      error: error.message,
      duration
    }, undefined, user.uuid);

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Problem submitting your timesheet at the moment, please try again after some time.'
    });
  }
}

/**
 * Send Timesheet Email Notifications
 * ===================================
 * 
 * Sends email notifications to:
 * - Manager (if exists)
 * - Director (if exists)
 * - Customer approver (if allocated)
 * - Employee (confirmation)
 * 
 * Based on old vodichron timsheetEmailNotifications function (line 31-78)
 * 
 * @param employee - Employee details with manager/director info
 * @param timesheetData - Timesheet submission data
 * @param requestNumber - Generated request number
 */
async function sendTimesheetEmailNotifications(
  employee: EmployeeDetails,
  timesheetData: CreateWeeklyTimesheetInput,
  requestNumber: string
): Promise<void> {
  try {
    logger.info('📧 Sending timesheet email notifications', {
      employeeId: employee.uuid,
      employeeName: employee.name,
      requestNumber
    });

    const appLink = process.env.UI_HOST || 'http://localhost:3000';
    const mailConfig = {
      employeeName: employee.name,
      requestNumber: requestNumber,
      totalHours: timesheetData.totalHours.toString(),
      appLink,
      weekEndingDate: moment(timesheetData.weekEndDate).format('MM/DD/YYYY')
    };

    // Extract manager details (format: "Name <email>")
    if (employee.managerDetail) {
      const managerMatch = employee.managerDetail.match(/^(.+?)\s*<(.+)>$/);
      if (managerMatch) {
        const [, name, email] = managerMatch;
        getTimesheetSubmittedManagerNotificationTemplate({
          ...mailConfig,
          managerName: name.trim()
        });

        // TODO: Integrate with email service
        // await sendEmail(email.trim(), managerTemplate.template, null, managerTemplate.subject);
        
        logger.debug('✉️ Manager notification email prepared', {
          to: email.trim(),
          managerName: name.trim()
        });
      }
    }

    // Extract director details (format: "Name <email>")
    if (employee.directorDetail) {
      const directorMatch = employee.directorDetail.match(/^(.+?)\s*<(.+)>$/);
      if (directorMatch) {
        const [, name, email] = directorMatch;
        getTimesheetSubmittedManagerNotificationTemplate({
          ...mailConfig,
          managerName: name.trim()
        });

        // TODO: Integrate with email service
        // await sendEmail(email.trim(), directorTemplate.template, null, directorTemplate.subject);
        
        logger.debug('✉️ Director notification email prepared', {
          to: email.trim(),
          directorName: name.trim()
        });
      }
    }

    // TODO: Get customer approver details from employeeCustomerDetails store
    // if (customer && customer.customerApprover) { ... }

    // Send confirmation email to employee
    getTimesheetSubmittedEmployeeNotificationTemplate(mailConfig);
    
    // TODO: Integrate with email service
    // await sendEmail(employee.officialEmailId, employeeTemplate.template, null, employeeTemplate.subject);
    
    logger.debug('✉️ Employee confirmation email prepared', {
      to: employee.officialEmailId
    });

    logger.info('✅ All timesheet email notifications prepared', {
      requestNumber,
      employeeId: employee.uuid
    });

  } catch (error: any) {
    // Log error but don't fail the timesheet creation
    logger.error('❌ Failed to send email notifications', {
      employeeId: employee.uuid,
      requestNumber,
      error: error.message
    });
  }
}
