/**
 * Master Cron Runner for Vodichron System
 * ========================================
 * Manages all automated cron jobs in the system.
 * Similar to master-seed-runner but for scheduled jobs.
 * 
 * Current Cron Jobs:
 * - Database Backup: Hourly backups with daily file rotation
 */

import { startBackupCronJob, stopBackupCronJob, getBackupCronJobStatus } from './database-backup.cron';
import { logger } from '../utils/logger';

/**
 * Start All Cron Jobs
 * ===================
 * 
 * Starts all configured cron jobs.
 * Should be called during server startup after database connection.
 */
export async function startAllCronJobs(): Promise<void> {
  logger.info('⏰ Starting Vodichron System cron jobs...');
  logger.info('');
  
  try {
    // ========================================================================
    // Cron Job 1: Database Backup (Hourly)
    // ========================================================================
    logger.info('📦 Step 1: Starting database backup cron job...');
    startBackupCronJob();
    logger.info('✅ Step 1: Database backup cron job started');
    logger.info('');
    
    // ========================================================================
    // Add more cron jobs here as needed
    // ========================================================================
    // Example:
    // logger.info('📧 Step 2: Starting email notification cron job...');
    // startEmailCronJob();
    // logger.info('✅ Step 2: Email notification cron job started');
    // logger.info('');
    
    // ========================================================================
    // Summary
    // ========================================================================
    logger.info('🎉 All cron jobs started successfully!');
    logger.info('');
    logger.info('📋 Active Cron Jobs:');
    logger.info('   1. Database Backup - Every hour (overwrites daily file)');
    logger.info('');
    
  } catch (error: any) {
    logger.error('💥 Failed to start cron jobs:', {
      error: error.message,
      stack: error.stack,
      type: 'CRON_STARTUP_ERROR'
    });
    throw error; // Re-throw to notify server startup
  }
}

/**
 * Stop All Cron Jobs
 * ==================
 * 
 * Stops all running cron jobs.
 * Should be called during graceful server shutdown.
 */
export function stopAllCronJobs(): void {
  logger.info('🛑 Stopping all cron jobs...');
  
  try {
    // Stop database backup cron job
    stopBackupCronJob();
    
    // Stop other cron jobs here...
    // stopEmailCronJob();
    
    logger.info('✅ All cron jobs stopped successfully');
    
  } catch (error: any) {
    logger.error('❌ Error stopping cron jobs:', {
      error: error.message,
      stack: error.stack
    });
    // Don't throw during shutdown
  }
}

/**
 * Get All Cron Jobs Status
 * ========================
 * 
 * Returns status of all cron jobs.
 * Useful for monitoring and health checks.
 */
export function getAllCronJobsStatus(): {
  databaseBackup: ReturnType<typeof getBackupCronJobStatus>;
  // Add more cron job statuses here...
} {
  return {
    databaseBackup: getBackupCronJobStatus(),
    // emailNotifications: getEmailCronJobStatus(),
  };
}

/**
 * Individual cron job exports for selective control if needed
 */
export {
  startBackupCronJob,
  stopBackupCronJob,
  getBackupCronJobStatus
};
