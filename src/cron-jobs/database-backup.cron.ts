/**
 * Database Backup Cron Job
 * ========================
 * 
 * Automated hourly database backups with daily file rotation.
 * 
 * Strategy:
 * - Runs every 1 hour
 * - Backup filename: database_backup_YYYY-MM-DD.sql (date only, no time)
 * - Same day: Overwrites existing file (keeps latest hourly backup)
 * - New day: Creates new file with new date
 * - Result: One backup file per day (most recent)
 * 
 * Features:
 * - Encrypted backups with AES-256-GCM
 * - Automatic old backup cleanup (retention policy)
 * - Error handling and retry logic
 * - Comprehensive logging
 */

import { CronJob } from 'cron';
import { createDatabaseBackup, cleanupOldBackups } from '../services/database-backup.service';
import { logger, logSystem } from '../utils/logger';
import { config } from '../config';

/**
 * Backup Configuration
 * ===================
 */
const BACKUP_CONFIG = {
  // Cron schedule: Every hour (at minute 0)
  schedule: '0 * * * *', // "At minute 0 of every hour"
  
  // Backup settings
  encrypt: true,
  retentionDays: 30, // Keep backups for 30 days
  
  // Timezone for cron (optional, defaults to Asia/Kolkata)
  timezone: 'Asia/Kolkata',
  
  // Enable/disable backup job
  enabled: true,
};

/**
 * Get Backup Password from Environment
 * ====================================
 * 
 * IMPORTANT: Set BACKUP_ENCRYPTION_PASSWORD in your .env file
 */
function getBackupPassword(): string {
  const password = process.env.BACKUP_ENCRYPTION_PASSWORD;
  
  if (!password) {
    logger.warn('⚠️ BACKUP_ENCRYPTION_PASSWORD not set in environment. Using default (INSECURE)');
    return 'VodichronDefaultBackupPassword2024!@#'; // Default fallback (should be changed)
  }
  
  return password;
}

/**
 * Generate Daily Backup Filename
 * ==============================
 * 
 * Format: database_backup_YYYY-MM-DD.sql.encrypted.json
 * Same filename for entire day = overwrite on each run
 */
function getDailyBackupFilename(): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `database_backup_${today}.sql`;
}

/**
 * Execute Backup Job
 * ==================
 * 
 * Main backup execution function.
 * Called by cron scheduler every hour.
 */
async function executeBackupJob(): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info('⏰ Hourly backup cron job triggered', {
      timestamp: new Date().toISOString(),
      schedule: BACKUP_CONFIG.schedule
    });

    logSystem('BACKUP_CRON_START', {
      timestamp: new Date().toISOString()
    });

    // ========================================================================
    // STEP 1: Get Backup Configuration
    // ========================================================================
    const password = getBackupPassword();
    const customFilename = getDailyBackupFilename();
    
    logger.info('📋 Backup configuration prepared', {
      filename: customFilename,
      encrypted: BACKUP_CONFIG.encrypt,
      date: new Date().toISOString().split('T')[0]
    });

    // ========================================================================
    // STEP 2: Create Backup (with custom filename for daily overwrite)
    // ========================================================================
    logger.info('📦 Creating database backup...');
    
    const result = await createDatabaseBackup({
      encrypt: BACKUP_CONFIG.encrypt,
      password: password,
      includeSchema: true,
      includeData: true,
      // Custom output directory to control filename
      outputDir: undefined // Uses default db_backups directory
    });

    // Note: The backup service generates its own filename with timestamp
    // We need to rename it to our daily format
    const fs = require('fs');
    const path = require('path');
    
    const backupDir = path.join(process.cwd(), 'db_backups');
    const dailyFilename = BACKUP_CONFIG.encrypt 
      ? `${customFilename}.encrypted.json`
      : customFilename;
    const dailyFilePath = path.join(backupDir, dailyFilename);
    
    // Rename the generated backup to daily format (overwrites if exists)
    fs.renameSync(result.filePath, dailyFilePath);
    
    // Also rename metadata file
    if (fs.existsSync(result.filePath + '.meta.json')) {
      fs.renameSync(
        result.filePath + '.meta.json',
        dailyFilePath + '.meta.json'
      );
    }

    logger.info('✅ Database backup created successfully', {
      filename: dailyFilename,
      size: `${(result.size / 1024 / 1024).toFixed(2)} MB`,
      encrypted: result.encrypted,
      duration: `${result.duration}ms`,
      path: dailyFilePath
    });

    // ========================================================================
    // STEP 3: Cleanup Old Backups (Retention Policy)
    // ========================================================================
    logger.info('🧹 Running backup cleanup...');
    
    const deletedCount = await cleanupOldBackups(BACKUP_CONFIG.retentionDays);
    
    logger.info('✅ Backup cleanup completed', {
      deletedBackups: deletedCount,
      retentionDays: BACKUP_CONFIG.retentionDays
    });

    // ========================================================================
    // STEP 4: Log Success
    // ========================================================================
    const duration = Date.now() - startTime;

    logSystem('BACKUP_CRON_SUCCESS', {
      filename: dailyFilename,
      size: result.size,
      encrypted: result.encrypted,
      duration: `${duration}ms`,
      deletedOldBackups: deletedCount
    });

    logger.info('🎉 Hourly backup cron job completed successfully', {
      totalDuration: `${duration}ms`,
      nextRun: 'In 1 hour'
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;

    logSystem('BACKUP_CRON_FAILED', {
      error: error.message,
      duration: `${duration}ms`
    });

    logger.error('❌ Hourly backup cron job failed', {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Don't throw - let cron continue for next run
  }
}

/**
 * Database Backup Cron Job Instance
 * =================================
 * 
 * Cron job that runs every hour to create/update daily backup.
 */
export const databaseBackupCronJob = new CronJob(
  BACKUP_CONFIG.schedule, // Every hour (minute 0)
  executeBackupJob, // Function to execute
  null, // onComplete (not needed)
  false, // Start immediately? (no, we'll start manually)
  BACKUP_CONFIG.timezone, // Timezone
  null, // Context (not needed)
  true // Run on init? (no)
);

/**
 * Start Backup Cron Job
 * =====================
 * 
 * Starts the automated backup cron job.
 * Should be called during server startup.
 */
export function startBackupCronJob(): void {
  if (!BACKUP_CONFIG.enabled) {
    logger.warn('⚠️ Database backup cron job is DISABLED in configuration');
    return;
  }

  try {
    databaseBackupCronJob.start();
    
    logger.info('✅ Database backup cron job started', {
      schedule: BACKUP_CONFIG.schedule,
      scheduleDescription: 'Every hour (at minute 0)',
      timezone: BACKUP_CONFIG.timezone,
      retentionDays: BACKUP_CONFIG.retentionDays,
      encrypted: BACKUP_CONFIG.encrypt,
      nextRun: databaseBackupCronJob.nextDate().toJSDate().toISOString()
    });

    logSystem('BACKUP_CRON_STARTED', {
      schedule: BACKUP_CONFIG.schedule,
      timezone: BACKUP_CONFIG.timezone
    });

  } catch (error: any) {
    logger.error('❌ Failed to start database backup cron job', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Stop Backup Cron Job
 * ====================
 * 
 * Stops the backup cron job.
 * Should be called during graceful shutdown.
 */
export function stopBackupCronJob(): void {
  try {
    databaseBackupCronJob.stop();
    logger.info('🛑 Database backup cron job stopped');
    logSystem('BACKUP_CRON_STOPPED', {});
  } catch (error) {
    // Job might not be running
  }
}

/**
 * Get Backup Cron Job Status
 * ==========================
 * 
 * Returns current status of the backup cron job.
 */
export function getBackupCronJobStatus(): {
  running: boolean;
  schedule: string;
  nextRun: string | null;
  retentionDays: number;
  encrypted: boolean;
} {
  let isRunning = false;
  let nextRun: string | null = null;
  
  try {
    // Try to get next date if cron is running
    const nextDate = databaseBackupCronJob.nextDate();
    if (nextDate) {
      nextRun = nextDate.toJSDate().toISOString();
      isRunning = true;
    }
  } catch {
    // Cron job not running
  }
  
  return {
    running: isRunning,
    schedule: BACKUP_CONFIG.schedule,
    nextRun,
    retentionDays: BACKUP_CONFIG.retentionDays,
    encrypted: BACKUP_CONFIG.encrypt
  };
}
