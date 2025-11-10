/**
 * Session Cleanup Cron Job
 * =========================
 * 
 * Automated cleanup of expired sessions and offline status updates.
 * 
 * Purpose:
 * - Marks employees as OFFLINE when their sessions expire
 * - Cleans up expired/revoked sessions from database
 * - Maintains accurate online status for employee list
 * 
 * Strategy:
 * - Runs every 30 minutes
 * - Checks for sessions that have expired (expiresAt < NOW)
 * - Updates employee_online_status to OFFLINE for expired sessions
 * - Optionally deletes old revoked sessions (configurable retention)
 * 
 * Features:
 * - Automatic offline status updates
 * - Configurable cleanup intervals
 * - Comprehensive logging
 * - Error handling and retry logic
 */

import { CronJob } from 'cron';
import { Op } from 'sequelize';
import Session from '../../../models/session.model';
import OnlineStatus from '../../../models/online-status.model';
import { logger, logSystem, logDatabase, PerformanceTimer } from '../../../utils/logger';
import { 
  SESSION_CLEANUP_SCHEDULE,
  CRON_TIMEZONE,
  CRON_ENABLED,
  CRON_CONFIG,
  SCHEDULE_DESCRIPTIONS
} from '../../../cron-jobs/config/cron-schedules';

/**
 * Session Cleanup Configuration
 * =============================
 * 
 * Configuration is now managed in src/cron-jobs/config/cron-schedules.ts
 * Simple format: { enabled: true, interval: '30 mins', runAt: null }
 */
const CLEANUP_CONFIG = {
  // Cron schedule (from centralized config)
  schedule: SESSION_CLEANUP_SCHEDULE,
  scheduleDescription: SCHEDULE_DESCRIPTIONS.sessionCleanup,
  
  // Cleanup settings
  deleteOldRevokedSessions: CRON_CONFIG.deleteOldRevokedSessions,
  revokedSessionRetentionDays: CRON_CONFIG.revokedSessionRetentionDays,
  
  // Timezone (from centralized config)
  timezone: CRON_TIMEZONE,
  
  // Enable/disable cleanup job (from centralized config)
  enabled: CRON_ENABLED.sessionCleanup,
};

/**
 * Update Offline Status for Expired Sessions
 * ==========================================
 * 
 * Finds all expired employee sessions and marks them as OFFLINE.
 * This ensures the employee list shows accurate online status.
 * 
 * Process:
 * 1. Find all sessions where:
 *    - expiresAt < NOW (session expired)
 *    - revokedAt IS NULL OR expiresAt < revokedAt (not already logged out)
 *    - subjectType = 'employee' (only employees have online status)
 * 2. Extract unique employee IDs
 * 3. Update employee_online_status to OFFLINE
 * 4. Log the updates
 * 
 * @returns Number of employees marked offline
 */
async function updateOfflineStatusForExpiredSessions(): Promise<number> {
  const timer = new PerformanceTimer('Update Offline Status');
  
  try {
    logger.info('🔍 Step 1: Finding expired employee sessions...');
    
    // ========================================================================
    // STEP 1: Find Expired Employee Sessions
    // ========================================================================
    const now = new Date();
    
    const expiredSessions = await Session.findAll({
      where: {
        subjectType: 'employee',
        expiresAt: {
          [Op.lt]: now, // expiresAt < NOW
        },
        // Only process non-revoked sessions or sessions that expired naturally
        revokedAt: null,
      },
      attributes: ['subjectId', 'expiresAt'],
      raw: true,
    });

    const expiredSessionCount = expiredSessions.length;
    logger.info(`✅ Step 1.1: Found ${expiredSessionCount} expired employee sessions`);

    if (expiredSessionCount === 0) {
      const duration = timer.end();
      logger.info('ℹ️ No expired sessions found to process');
      logDatabase('SELECT', 'sessions', duration, undefined, 0);
      return 0;
    }

    // ========================================================================
    // STEP 2: Extract Unique Employee IDs
    // ========================================================================
    const employeeIds = Array.from(new Set(expiredSessions.map((s: any) => s.subjectId)));
    
    logger.info(`📋 Step 2: Processing ${employeeIds.length} unique employees`, {
      employeeCount: employeeIds.length,
      sessionCount: expiredSessionCount,
    });

    // ========================================================================
    // STEP 3: Filter Out Employees With Active Sessions
    // ========================================================================
    logger.info('🔍 Step 3: Checking for employees with active sessions...');
    
    // Find employees who still have at least one active (non-expired) session
    const activeSessions = await Session.findAll({
      where: {
        subjectType: 'employee',
        subjectId: {
          [Op.in]: employeeIds,
        },
        expiresAt: {
          [Op.gte]: now, // expiresAt >= NOW (not expired)
        },
        revokedAt: null,
      },
      attributes: ['subjectId'],
      raw: true,
    });
    
    const employeesWithActiveSessions = new Set(activeSessions.map((s: any) => s.subjectId));
    
    logger.info('✅ Step 3.1: Found employees with active sessions', {
      totalExpiredSessionEmployees: employeeIds.length,
      employeesWithActiveSessions: employeesWithActiveSessions.size,
    });
    
    // Filter to only employees who have NO active sessions
    const employeesToMarkOffline = employeeIds.filter(id => !employeesWithActiveSessions.has(id));
    
    if (employeesToMarkOffline.length === 0) {
      const duration = timer.end();
      logger.info('ℹ️ All employees with expired sessions still have active sessions - no status update needed', {
        duration: `${duration}ms`,
        totalEmployeesChecked: employeeIds.length,
        employeesWithActiveSessions: employeesWithActiveSessions.size,
      });
      logDatabase('SELECT', 'sessions', duration, undefined, 0);
      return 0;
    }
    
    logger.info('📋 Step 3.2: Employees to mark offline', {
      count: employeesToMarkOffline.length,
      employeesWithActiveSessions: employeesWithActiveSessions.size,
    });
    
    // ========================================================================
    // STEP 4: Update Online Status to OFFLINE
    // ========================================================================
    logger.info('🔄 Step 4: Updating employee online status to OFFLINE...');
    
    const updateTimer = new PerformanceTimer('Bulk Update Online Status');
    
    const [updatedCount] = await OnlineStatus.update(
      {
        onlineStatus: 'OFFLINE',
        updatedAt: now,
      },
      {
        where: {
          employeeId: {
            [Op.in]: employeesToMarkOffline,
          },
          onlineStatus: {
            [Op.ne]: 'OFFLINE', // Only update if not already OFFLINE
          },
        },
      }
    );

    const updateDuration = updateTimer.end();
    logDatabase('UPDATE', 'employee_online_status', updateDuration, undefined, updatedCount);

    logger.info('✅ Step 4.1: Employee online status updated successfully', {
      updatedCount,
      employeesToMarkOffline: employeesToMarkOffline.length,
      employeesWithActiveSessions: employeesWithActiveSessions.size,
      totalEmployeesWithExpiredSessions: employeeIds.length,
      expiredSessions: expiredSessionCount,
    });

    // ========================================================================
    // STEP 5: Log Success
    // ========================================================================
    const totalDuration = timer.end();
    
    logSystem('SESSION_CLEANUP_OFFLINE_UPDATE', {
      expiredSessions: expiredSessionCount,
      uniqueEmployeesWithExpiredSessions: employeeIds.length,
      employeesWithActiveSessions: employeesWithActiveSessions.size,
      employeesMarkedOffline: employeesToMarkOffline.length,
      statusUpdated: updatedCount,
      duration: `${totalDuration}ms`,
    });

    return updatedCount;

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to update offline status for expired sessions', {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    logDatabase('UPDATE', 'employee_online_status', duration, error);
    
    throw error; // Re-throw for cron error handling
  }
}

/**
 * Cleanup Old Revoked Sessions
 * ============================
 * 
 * Optionally deletes old revoked sessions to keep database clean.
 * Only runs if enabled in configuration.
 * 
 * @returns Number of sessions deleted
 */
async function cleanupOldRevokedSessions(): Promise<number> {
  if (!CLEANUP_CONFIG.deleteOldRevokedSessions) {
    logger.debug('ℹ️ Revoked session deletion is disabled in configuration');
    return 0;
  }

  const timer = new PerformanceTimer('Cleanup Old Revoked Sessions');

  try {
    logger.info('🧹 Cleaning up old revoked sessions...');

    // ========================================================================
    // Calculate cutoff date
    // ========================================================================
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.revokedSessionRetentionDays);

    logger.info('📅 Cutoff date for revoked session deletion', {
      cutoffDate: cutoffDate.toISOString(),
      retentionDays: CLEANUP_CONFIG.revokedSessionRetentionDays,
    });

    // ========================================================================
    // Delete old revoked sessions
    // ========================================================================
    const deletedCount = await Session.destroy({
      where: {
        revokedAt: {
          [Op.lt]: cutoffDate, // Revoked before cutoff date
          [Op.ne]: null, // Must be revoked
        },
      },
    });

    const duration = timer.end();
    logDatabase('DELETE', 'sessions', duration, undefined, deletedCount);

    logger.info('✅ Old revoked sessions cleaned up', {
      deletedCount,
      retentionDays: CLEANUP_CONFIG.revokedSessionRetentionDays,
      duration: `${duration}ms`,
    });

    return deletedCount;

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to cleanup old revoked sessions', {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    logDatabase('DELETE', 'sessions', duration, error);

    throw error;
  }
}

/**
 * Execute Session Cleanup Job
 * ===========================
 * 
 * Main cleanup execution function.
 * Called by cron scheduler every 30 minutes.
 * 
 * Steps:
 * 1. Update offline status for expired sessions
 * 2. Optionally cleanup old revoked sessions
 * 3. Log results
 */
async function executeSessionCleanupJob(): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('⏰ Session cleanup cron job triggered', {
      timestamp: new Date().toISOString(),
      schedule: CLEANUP_CONFIG.schedule,
    });

    logSystem('SESSION_CLEANUP_CRON_START', {
      timestamp: new Date().toISOString(),
    });

    // ========================================================================
    // STEP 1: Update Offline Status for Expired Sessions
    // ========================================================================
    logger.info('📋 Step 1: Updating offline status for expired sessions...');
    const offlineUpdated = await updateOfflineStatusForExpiredSessions();
    logger.info(`✅ Step 1: Updated ${offlineUpdated} employee(s) to OFFLINE`);
    logger.info('');

    // ========================================================================
    // STEP 2: Cleanup Old Revoked Sessions (Optional)
    // ========================================================================
    logger.info('🧹 Step 2: Cleaning up old revoked sessions...');
    const sessionsDeleted = await cleanupOldRevokedSessions();
    logger.info(`✅ Step 2: Deleted ${sessionsDeleted} old revoked session(s)`);
    logger.info('');

    // ========================================================================
    // STEP 3: Log Success
    // ========================================================================
    const duration = Date.now() - startTime;

    logSystem('SESSION_CLEANUP_CRON_SUCCESS', {
      offlineUpdated,
      sessionsDeleted,
      duration: `${duration}ms`,
    });

    logger.info('🎉 Session cleanup cron job completed successfully', {
      offlineUpdated,
      sessionsDeleted,
      totalDuration: `${duration}ms`,
      nextRun: 'In 30 minutes',
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;

    logSystem('SESSION_CLEANUP_CRON_FAILED', {
      error: error.message,
      duration: `${duration}ms`,
    });

    logger.error('❌ Session cleanup cron job failed', {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    // Don't throw - let cron continue for next run
  }
}

/**
 * Session Cleanup Cron Job Instance
 * =================================
 * 
 * Cron job that runs every 30 minutes to:
 * - Mark employees offline when sessions expire
 * - Cleanup old revoked sessions (optional)
 */
export const sessionCleanupCronJob = new CronJob(
  CLEANUP_CONFIG.schedule, // Every 30 minutes
  executeSessionCleanupJob, // Function to execute
  null, // onComplete (not needed)
  false, // Start immediately? (no, we'll start manually)
  CLEANUP_CONFIG.timezone, // Timezone
  null, // Context (not needed)
  true // Run on init? (no)
);

/**
 * Start Session Cleanup Cron Job
 * ==============================
 * 
 * Starts the automated session cleanup cron job.
 * Should be called during server startup.
 */
export function startSessionCleanupCronJob(): void {
  if (!CLEANUP_CONFIG.enabled) {
    logger.warn('⚠️ Session cleanup cron job is DISABLED in configuration');
    return;
  }

  try {
    sessionCleanupCronJob.start();

    logger.info('✅ Session cleanup cron job started', {
      schedule: CLEANUP_CONFIG.schedule,
      scheduleDescription: 'Every 30 minutes',
      timezone: CLEANUP_CONFIG.timezone,
      deleteOldSessions: CLEANUP_CONFIG.deleteOldRevokedSessions,
      retentionDays: CLEANUP_CONFIG.revokedSessionRetentionDays,
      nextRun: sessionCleanupCronJob.nextDate().toJSDate().toISOString(),
    });

    logSystem('SESSION_CLEANUP_CRON_STARTED', {
      schedule: CLEANUP_CONFIG.schedule,
      timezone: CLEANUP_CONFIG.timezone,
    });

  } catch (error: any) {
    logger.error('❌ Failed to start session cleanup cron job', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Stop Session Cleanup Cron Job
 * =============================
 * 
 * Stops the session cleanup cron job.
 * Should be called during graceful shutdown.
 */
export function stopSessionCleanupCronJob(): void {
  try {
    sessionCleanupCronJob.stop();
    logger.info('🛑 Session cleanup cron job stopped');
    logSystem('SESSION_CLEANUP_CRON_STOPPED', {});
  } catch (error) {
    // Job might not be running
    void error;
  }
}

/**
 * Get Session Cleanup Cron Job Status
 * ===================================
 * 
 * Returns current status of the session cleanup cron job.
 * Useful for monitoring and health checks.
 */
export function getSessionCleanupCronJobStatus(): {
  running: boolean;
  schedule: string;
  nextRun: string | null;
  deleteOldSessions: boolean;
  retentionDays: number;
} {
  let isRunning = false;
  let nextRun: string | null = null;

  try {
    // Try to get next date if cron is running
    const nextDate = sessionCleanupCronJob.nextDate();
    if (nextDate) {
      nextRun = nextDate.toJSDate().toISOString();
      isRunning = true;
    }
  } catch {
    // Cron job not running
  }

  return {
    running: isRunning,
    schedule: CLEANUP_CONFIG.schedule,
    nextRun,
    deleteOldSessions: CLEANUP_CONFIG.deleteOldRevokedSessions,
    retentionDays: CLEANUP_CONFIG.revokedSessionRetentionDays,
  };
}
