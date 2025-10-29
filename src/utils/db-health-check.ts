import { testConnection, getDatabaseInfo } from '../database';
import { logger } from './logger';

/**
 * Database Health Check Utility
 * -----------------------------
 * Performs comprehensive health check on the database connection
 */

/**
 * Perform Database Health Check
 * ----------------------------
 * Tests the database connection and returns connection status with info
 * 
 * @returns Promise<void> - Resolves if healthy, throws if not
 * @throws Error if database health check fails
 */
export const performDatabaseHealthCheck = async (): Promise<void> => {
  try {
    const isHealthy = await testConnection();
    const dbInfo = getDatabaseInfo();
    
    if (isHealthy) {
      logger.info('✅ Database health check passed', {
        ...dbInfo,
        type: 'DATABASE_HEALTH_CHECK'
      });
    } else {
      logger.error('❌ Database health check failed');
      throw new Error('Database health check failed');
    }
  } catch (error: any) {
    logger.error(`❌ Database health check error: ${error.message}`);
    throw error;
  }
};
