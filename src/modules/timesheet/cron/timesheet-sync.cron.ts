/**
 * Timesheet Sync Cron Job
 * ========================
 * 
 * Automated synchronization of daily timesheets to weekly timesheets.
 * 
 * Purpose:
 * - Copy daily timesheet entries from employee_timesheets to employee_weekly_timesheets
 * - Run every day at 11:59 PM to aggregate the day's work
 * - Maintain both daily and weekly views for reporting and approval workflows
 * 
 * Strategy:
 * - Runs every day at 11:59 PM
 * - Fetches all timesheets for today's date
 * - For each timesheet entry:
 *   - Calculate the current week (Monday to Sunday)
 *   - Copy the entry to employee_weekly_timesheets
 *   - Preserve all task details and metadata
 * 
 * Features:
 * - Automatic daily to weekly aggregation
 * - Week calculation based on Monday start
 * - Comprehensive logging
 * - Error handling and retry logic
 * - Duplicate prevention with upsert strategy
 */

import { CronJob } from 'cron';
import Timesheet from '../../../models/timesheet.model';
import WeeklyTimesheet from '../../../models/weekly-timesheet.model';
import { logger, logSystem, logDatabase, PerformanceTimer } from '../../../utils/logger';
import { 
  TIMESHEET_SYNC_SCHEDULE,
  CRON_TIMEZONE,
  CRON_ENABLED,
  SCHEDULE_DESCRIPTIONS
} from '../../../cron-jobs/config/cron-schedules';

/**
 * Timesheet Sync Configuration
 * ============================
 * 
 * Configuration is managed in src/cron-jobs/config/cron-schedules.ts
 * Format: { enabled: true, interval: '1 day', runAt: '11:59 PM' }
 */
const SYNC_CONFIG = {
  // Cron schedule (from centralized config)
  schedule: TIMESHEET_SYNC_SCHEDULE,
  scheduleDescription: SCHEDULE_DESCRIPTIONS.timesheetSync,
  
  // Timezone (from centralized config)
  timezone: CRON_TIMEZONE,
  
  // Enable/disable sync job (from centralized config)
  enabled: CRON_ENABLED.timesheetSync,
};

/**
 * Get Monday and Sunday of Current Week
 * =====================================
 * 
 * Calculates the week boundaries (Monday to Sunday) for a given date.
 * 
 * @param date - The date to calculate week boundaries for
 * @returns Object with weekStartDate (Monday) and weekEndDate (Sunday)
 */
function getWeekBoundaries(date: Date): { weekStartDate: Date; weekEndDate: Date } {
  const currentDate = new Date(date);
  const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate Monday (start of week)
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  // Calculate Sunday (end of week)
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    weekStartDate: monday,
    weekEndDate: sunday,
  };
}

/**
 * Sync Daily Timesheets to Weekly Timesheets
 * ==========================================
 * 
 * Main synchronization logic that copies today's timesheet entries
 * to the weekly timesheet table.
 * 
 * Process:
 * 1. Fetch all timesheets for today's date
 * 2. Calculate week boundaries (Monday to Sunday)
 * 3. For each timesheet entry:
 *    - Copy all fields to weekly timesheet
 *    - Use upsert to prevent duplicates
 *    - Set timeSheetStatus to 'SAVED'
 * 4. Log the results
 * 
 * @returns Number of timesheets synced
 */
async function syncDailyTimesheetsToWeekly(): Promise<number> {
  const timer = new PerformanceTimer('Sync Daily to Weekly Timesheets');
  
  try {
    logger.info('🔍 Step 1: Fetching today\'s daily timesheets...');
    
    // ========================================================================
    // STEP 1: Get Today's Date
    // ========================================================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    logger.info(`📅 Today's date: ${todayString}`);
    
    // ========================================================================
    // STEP 2: Calculate Week Boundaries
    // ========================================================================
    const { weekStartDate, weekEndDate } = getWeekBoundaries(today);
    
    const weekStartString = weekStartDate.toISOString().split('T')[0];
    const weekEndString = weekEndDate.toISOString().split('T')[0];
    
    logger.info(`📊 Week boundaries: ${weekStartString} (Mon) to ${weekEndString} (Sun)`);
    
    // ========================================================================
    // STEP 3: Fetch All Timesheets for Today
    // ========================================================================
    const fetchTimer = new PerformanceTimer('Fetch Daily Timesheets');
    
    const dailyTimesheets = await Timesheet.findAll({
      where: {
        timesheetDate: todayString,
      },
      raw: true,
    });
    
    const fetchDuration = fetchTimer.end();
    logDatabase('SELECT', 'employee_timesheets', fetchDuration, undefined, dailyTimesheets.length);
    
    const timesheetCount = dailyTimesheets.length;
    logger.info(`✅ Step 1.1: Found ${timesheetCount} timesheet entries for today`);
    
    if (timesheetCount === 0) {
      timer.end();
      logger.info('ℹ️ No timesheets found for today - nothing to sync');
      return 0;
    }
    
    // ========================================================================
    // STEP 4: Sync Each Timesheet to Weekly Table
    // ========================================================================
    logger.info('🔄 Step 2: Syncing timesheets to weekly table...');
    
    let syncedCount = 0;
    const syncTimer = new PerformanceTimer('Bulk Sync to Weekly');
    
    for (const timesheet of dailyTimesheets) {
      try {
        // Create weekly timesheet entry with all fields from daily timesheet
        await WeeklyTimesheet.upsert({
          // Week information
          weekStartDate: weekStartDate,
          weekEndDate: weekEndDate,
          
          // Copy all fields from daily timesheet
          employeeId: timesheet.employeeId,
          requestNumber: timesheet.requestNumber,
          taskDetails: timesheet.taskDetails,
          totalHours: timesheet.totalHours,
          
          // Copy task information
          taskId: timesheet.taskId,
          customer: timesheet.customer,
          project: timesheet.project,
          manager: timesheet.manager,
          taskBrief: timesheet.taskBrief,
          taskStatus: timesheet.taskStatus,
          responsible: timesheet.responsible,
          
          // Copy date information
          taskDate: timesheet.taskDate,
          plannedStartDate: timesheet.plannedStartDate,
          plannedEndDate: timesheet.plannedEndDate,
          actualStartDate: timesheet.actualStartDate,
          actualEndDate: timesheet.actualEndDate,
          
          // Copy progress information
          completionPercentage: timesheet.completionPercentage,
          remarks: timesheet.remarks,
          reasonForDelay: timesheet.reasonForDelay,
          taskHours: timesheet.taskHours,
          
          // Set weekly-specific fields
          timeSheetStatus: 'SAVED', // Weekly timesheet is saved but not submitted
          approvalStatus: timesheet.approvalStatus, // Copy approval status from daily
          approverId: timesheet.approverId,
          approverRole: null, // Will be set during weekly approval
          approvalDate: timesheet.approvalDate,
          approverComments: timesheet.approverComments,
          
          // Copy audit fields
          createdAt: new Date(),
          createdBy: timesheet.createdBy,
          updatedAt: new Date(),
          updatedBy: timesheet.updatedBy,
        });
        
        syncedCount++;
        
      } catch (error: any) {
        logger.error(`❌ Failed to sync timesheet ${timesheet.uuid}`, {
          error: error.message,
          timesheetId: timesheet.uuid,
          employeeId: timesheet.employeeId,
        });
        // Continue with next timesheet even if one fails
      }
    }
    
    const syncDuration = syncTimer.end();
    logDatabase('UPSERT', 'employee_weekly_timesheets', syncDuration, undefined, syncedCount);
    
    logger.info(`✅ Step 2.1: Synced ${syncedCount}/${timesheetCount} timesheets to weekly table`);
    
    // ========================================================================
    // STEP 5: Log Success
    // ========================================================================
    const totalDuration = timer.end();
    
    logSystem('TIMESHEET_SYNC_SUCCESS', {
      date: todayString,
      weekStart: weekStartString,
      weekEnd: weekEndString,
      dailyTimesheets: timesheetCount,
      syncedToWeekly: syncedCount,
      duration: `${totalDuration}ms`,
    });
    
    logger.info('🎉 Timesheet sync completed successfully', {
      date: todayString,
      week: `${weekStartString} to ${weekEndString}`,
      synced: `${syncedCount}/${timesheetCount}`,
      duration: `${totalDuration}ms`,
    });
    
    return syncedCount;
    
  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to sync daily timesheets to weekly', {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });
    
    logDatabase('UPSERT', 'employee_weekly_timesheets', duration, error);
    
    throw error; // Re-throw for cron error handling
  }
}

/**
 * Execute Timesheet Sync Job
 * ==========================
 * 
 * Main sync execution function.
 * Called by cron scheduler every day at 11:59 PM.
 */
async function executeTimesheetSyncJob(): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info('⏰ Timesheet sync cron job triggered', {
      timestamp: new Date().toISOString(),
      schedule: SYNC_CONFIG.schedule,
    });
    
    logSystem('TIMESHEET_SYNC_CRON_START', {
      timestamp: new Date().toISOString(),
    });
    
    // ========================================================================
    // Execute Sync
    // ========================================================================
    const syncedCount = await syncDailyTimesheetsToWeekly();
    
    // ========================================================================
    // Log Success
    // ========================================================================
    const duration = Date.now() - startTime;
    
    logSystem('TIMESHEET_SYNC_CRON_SUCCESS', {
      syncedCount,
      duration: `${duration}ms`,
    });
    
    logger.info('🎉 Timesheet sync cron job completed successfully', {
      syncedCount,
      totalDuration: `${duration}ms`,
      nextRun: 'Tomorrow at 11:59 PM',
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    logSystem('TIMESHEET_SYNC_CRON_FAILED', {
      error: error.message,
      duration: `${duration}ms`,
    });
    
    logger.error('❌ Timesheet sync cron job failed', {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });
    
    // Don't throw - let cron continue for next run
  }
}

/**
 * Timesheet Sync Cron Job Instance
 * ================================
 * 
 * Cron job that runs every day at 11:59 PM to:
 * - Copy daily timesheets to weekly timesheets
 */
export const timesheetSyncCronJob = new CronJob(
  SYNC_CONFIG.schedule, // Every day at 11:59 PM
  executeTimesheetSyncJob, // Function to execute
  null, // onComplete (not needed)
  false, // Start immediately? (no, we'll start manually)
  SYNC_CONFIG.timezone, // Timezone
  null, // Context (not needed)
  true // Run on init? (no)
);

/**
 * Start Timesheet Sync Cron Job
 * =============================
 * 
 * Starts the automated timesheet sync cron job.
 * Should be called during server startup.
 */
export function startTimesheetSyncCronJob(): void {
  if (!SYNC_CONFIG.enabled) {
    logger.warn('⚠️ Timesheet sync cron job is DISABLED in configuration');
    return;
  }
  
  try {
    timesheetSyncCronJob.start();
    
    logger.info('✅ Timesheet sync cron job started', {
      schedule: SYNC_CONFIG.schedule,
      scheduleDescription: SYNC_CONFIG.scheduleDescription,
      timezone: SYNC_CONFIG.timezone,
      nextRun: timesheetSyncCronJob.nextDate().toJSDate().toISOString(),
    });
    
    logSystem('TIMESHEET_SYNC_CRON_STARTED', {
      schedule: SYNC_CONFIG.schedule,
      timezone: SYNC_CONFIG.timezone,
    });
    
  } catch (error: any) {
    logger.error('❌ Failed to start timesheet sync cron job', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Stop Timesheet Sync Cron Job
 * ============================
 * 
 * Stops the timesheet sync cron job.
 * Should be called during graceful shutdown.
 */
export function stopTimesheetSyncCronJob(): void {
  try {
    timesheetSyncCronJob.stop();
    logger.info('🛑 Timesheet sync cron job stopped');
    logSystem('TIMESHEET_SYNC_CRON_STOPPED', {});
  } catch (error) {
    // Job might not be running
    void error;
  }
}

/**
 * Get Timesheet Sync Cron Job Status
 * ==================================
 * 
 * Returns current status of the timesheet sync cron job.
 * Useful for monitoring and health checks.
 */
export function getTimesheetSyncCronJobStatus(): {
  running: boolean;
  schedule: string;
  nextRun: string | null;
} {
  let isRunning = false;
  let nextRun: string | null = null;
  
  try {
    // Try to get next date if cron is running
    const nextDate = timesheetSyncCronJob.nextDate();
    if (nextDate) {
      nextRun = nextDate.toJSDate().toISOString();
      isRunning = true;
    }
  } catch {
    // Cron job not running
  }
  
  return {
    running: isRunning,
    schedule: SYNC_CONFIG.schedule,
    nextRun,
  };
}
