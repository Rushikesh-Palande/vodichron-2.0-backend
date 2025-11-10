/**
 * Cron Job Schedules Configuration
 * =================================
 * 
 * Centralized configuration for all cron job schedules.
 * Simple, human-readable format.
 */

/**
 * Database Backup Configuration
 */
export const DATABASE_BACKUP_CONFIG = {
  enabled: true,
  interval: '1 hour',  // Options: '30 mins', '1 hour', '2 hours', '6 hours', '12 hours'
  runAt: null,         // Optional: specific time like '2:00 AM', null = run on interval
};

/**
 * Session Cleanup Configuration
 */
export const SESSION_CLEANUP_CONFIG = {
  enabled: true,
  interval: '30 mins', // Options: '1 min', '5 mins', '10 mins', '30 mins', '1 hour'
  runAt: null,         // Optional: specific time like '3:00 AM', null = run on interval
};

/**
 * General Cron Settings
 */
export const CRON_SETTINGS = {
  timezone: 'Asia/Kolkata',
  
  // Database backup settings
  backupRetentionDays: 30,
  
  // Session cleanup settings
  deleteOldRevokedSessions: false,
  revokedSessionRetentionDays: 90,
};

/**
 * Helper function to convert human-readable config to cron pattern
 */
export function getCronSchedule(config: { interval: string; runAt: string | null }): string {
  // If specific time is set
  if (config.runAt) {
    const match = config.runAt.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let hour = parseInt(match[1]);
      const minute = parseInt(match[2]);
      const period = match[3].toUpperCase();
      
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      
      return `${minute} ${hour} * * *`; // Run daily at specified time
    }
  }
  
  // Otherwise use interval
  const intervalMap: { [key: string]: string } = {
    '1 min': '* * * * *',
    '5 mins': '*/5 * * * *',
    '10 mins': '*/10 * * * *',
    '15 mins': '*/15 * * * *',
    '30 mins': '*/30 * * * *',
    '1 hour': '0 * * * *',
    '2 hours': '0 */2 * * *',
    '3 hours': '0 */3 * * *',
    '6 hours': '0 */6 * * *',
    '12 hours': '0 */12 * * *',
  };
  
  return intervalMap[config.interval] || '0 * * * *'; // Default: every hour
}

/**
 * Get the actual cron schedules
 */
export const DATABASE_BACKUP_SCHEDULE = getCronSchedule(DATABASE_BACKUP_CONFIG);
export const SESSION_CLEANUP_SCHEDULE = getCronSchedule(SESSION_CLEANUP_CONFIG);

/**
 * Enable/Disable flags
 */
export const CRON_ENABLED = {
  databaseBackup: DATABASE_BACKUP_CONFIG.enabled,
  sessionCleanup: SESSION_CLEANUP_CONFIG.enabled,
};

/**
 * Timezone
 */
export const CRON_TIMEZONE = CRON_SETTINGS.timezone;

/**
 * Additional Config
 */
export const CRON_CONFIG = {
  backupRetentionDays: CRON_SETTINGS.backupRetentionDays,
  deleteOldRevokedSessions: CRON_SETTINGS.deleteOldRevokedSessions,
  revokedSessionRetentionDays: CRON_SETTINGS.revokedSessionRetentionDays,
  runOnInit: false,
};

/**
 * Human-readable descriptions for logging
 */
export const SCHEDULE_DESCRIPTIONS = {
  databaseBackup: DATABASE_BACKUP_CONFIG.runAt 
    ? `Every day at ${DATABASE_BACKUP_CONFIG.runAt}` 
    : `Every ${DATABASE_BACKUP_CONFIG.interval}`,
  sessionCleanup: SESSION_CLEANUP_CONFIG.runAt 
    ? `Every day at ${SESSION_CLEANUP_CONFIG.runAt}` 
    : `Every ${SESSION_CLEANUP_CONFIG.interval}`,
};
