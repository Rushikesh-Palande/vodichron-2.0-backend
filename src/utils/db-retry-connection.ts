import sequelize from '../database';
import { logger, logDatabase } from './logger';

/**
 * Database Connection Retry Utility
 * ----------------------------------
 * 
 * This utility provides robust database connection retry logic with:
 * - Configurable retry attempts and delay intervals
 * - Exponential backoff to avoid overwhelming the database
 * - Comprehensive logging of connection attempts and failures
 * - Connection health monitoring
 * - Graceful error handling and reporting
 */

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG = {
  maxRetries: 5,
  initialDelay: 2000,      // Start with 2 seconds
  maxDelay: 30000,         // Cap at 30 seconds
  backoffFactor: 2,        // Double the delay each time
  jitter: 0.1,             // Add 10% randomness to avoid thundering herd
};

/**
 * Database Connection Retry Function
 * ---------------------------------
 * Attempts to establish a connection to MySQL database using Sequelize
 * with exponential backoff retry strategy.
 * 
 * @param retries - Maximum number of retry attempts (default: 5)
 * @param delay - Initial delay between retries in milliseconds (default: 2000)
 * @param attempt - Current attempt number (used internally for recursion)
 * @returns Promise<void> - Resolves when connection is successful
 * @throws Error when all retry attempts are exhausted
 */
export const retryDatabaseConnection = async (
  retries: number = DEFAULT_CONFIG.maxRetries,
  delay: number = DEFAULT_CONFIG.initialDelay,
  attempt: number = 1
): Promise<void> => {
  const startTime = Date.now();
  
  try {
    logger.info(`🔄 Database connection attempt ${attempt}/${retries + 1}...`, {
      attempt,
      maxAttempts: retries + 1,
      delay: attempt > 1 ? `${delay}ms` : 'immediate',
      type: 'DATABASE_CONNECTION_ATTEMPT'
    });

    // Attempt to authenticate with the database
    await sequelize.authenticate();
    
    const duration = Date.now() - startTime;
    logDatabase('CONNECTION_AUTH', sequelize.getDatabaseName(), duration);
    
    logger.info(`✅ Database connection established successfully on attempt ${attempt}`, {
      attempt,
      duration: `${duration}ms`,
      database: sequelize.getDatabaseName(),
      host: sequelize.config.host,
      type: 'DATABASE_CONNECTION_SUCCESS'
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    logDatabase('CONNECTION_AUTH', sequelize.getDatabaseName(), duration, error);
    
    // Log the connection failure with details
    logger.error(`❌ Database connection attempt ${attempt} failed: ${error.message}`, {
      attempt,
      maxAttempts: retries + 1,
      duration: `${duration}ms`,
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
      },
      database: sequelize.getDatabaseName(),
      host: sequelize.config.host,
      type: 'DATABASE_CONNECTION_FAILED'
    });

    // Check if we have retries remaining
    if (retries > 0) {
      // Calculate next delay with exponential backoff and jitter
      const baseDelay = Math.min(
        delay * DEFAULT_CONFIG.backoffFactor,
        DEFAULT_CONFIG.maxDelay
      );
      
      // Add jitter to prevent thundering herd problem
      const jitter = baseDelay * DEFAULT_CONFIG.jitter * Math.random();
      const nextDelay = Math.floor(baseDelay + jitter);
      
      logger.info(`🔁 Retrying database connection in ${nextDelay}ms... (${retries} attempts remaining)`, {
        attemptsRemaining: retries,
        nextDelay: `${nextDelay}ms`,
        backoffStrategy: 'exponential',
        type: 'DATABASE_CONNECTION_RETRY'
      });

      // Wait for the calculated delay
      await new Promise(resolve => setTimeout(resolve, nextDelay));

      // Recursive call with decremented retry count and increased delay
      await retryDatabaseConnection(retries - 1, nextDelay, attempt + 1);
      
    } else {
      // All retry attempts have been exhausted
      const totalAttempts = attempt;
      
      logger.error(`🚨 Database connection failed after ${totalAttempts} attempts. Unable to establish connection.`, {
        totalAttempts,
        finalError: error.message,
        database: sequelize.getDatabaseName(),
        host: sequelize.config.host,
        suggestions: [
          'Check if MySQL server is running',
          'Verify database credentials in .env file',
          'Ensure database server is accessible from this host',
          'Check firewall settings',
          'Verify network connectivity'
        ],
        type: 'DATABASE_CONNECTION_EXHAUSTED'
      });

      // Create a comprehensive error message
      const connectionError = new Error(
        `Database connection failed after ${totalAttempts} attempts. Last error: ${error.message}`
      );
      
      // Preserve original error properties
      (connectionError as any).originalError = error;
      (connectionError as any).totalAttempts = totalAttempts;
      (connectionError as any).database = sequelize.getDatabaseName();
      (connectionError as any).host = sequelize.config.host;
      
      throw connectionError;
    }
  }
};

/**
 * Test Database Connection Health
 * ------------------------------
 * Performs a quick health check on the database connection
 * 
 * @returns Promise<boolean> - True if connection is healthy, false otherwise
 */
export const testDatabaseHealth = async (): Promise<boolean> => {
  try {
    const startTime = Date.now();
    await sequelize.authenticate();
    const duration = Date.now() - startTime;
    
    logger.info('✅ Database health check passed', {
      duration: `${duration}ms`,
      type: 'DATABASE_HEALTH_CHECK'
    });
    
    return true;
  } catch (error: any) {
    logger.warn('⚠️ Database health check failed', {
      error: error.message,
      type: 'DATABASE_HEALTH_CHECK_FAILED'
    });
    
    return false;
  }
};

/**
 * Get Connection Pool Status
 * -------------------------
 * Returns information about the current connection pool status
 * 
 * @returns Object containing pool statistics
 */
export const getConnectionPoolStatus = () => {
  const pool = (sequelize as any).connectionManager?.pool;
  
  if (!pool) {
    return {
      available: false,
      message: 'Connection pool not initialized'
    };
  }

  return {
    available: true,
    size: pool.size || 0,
    used: pool.used || 0,
    waiting: pool.pending || 0,
    max: sequelize.config.pool?.max || 0,
    min: sequelize.config.pool?.min || 0,
    idle: sequelize.config.pool?.idle || 0,
    acquire: sequelize.config.pool?.acquire || 0,
  };
};
