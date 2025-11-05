import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';

import { config } from '../config';
import { logger, logDatabase, logSystem, PerformanceTimer } from '../utils/logger';
import { retryDatabaseConnection } from '../utils/db-retry-connection';

/**
 * Database Module for Vodichron HRMS System
 * -----------------------------------------
 * 
 * This module provides comprehensive database functionality including:
 * - Automatic database creation if it doesn't exist
 * - Sequelize ORM configuration with connection pooling
 * - Database connection retry logic with exponential backoff
 * - Model synchronization with schema migration support
 * - Production-ready connection pool configuration
 * - Comprehensive error handling and logging
 * - Graceful connection cleanup
 */

/**
 * Create Database If Not Exists
 * -----------------------------
 * This function ensures that the target database exists by creating
 * a temporary connection to the MySQL server and executing a CREATE DATABASE query.
 * 
 * @returns Promise<void> - Resolves when database is created/verified
 * @throws Error if database creation fails
 */
export const createDatabase = async (): Promise<void> => {
  const startTime = Date.now();
  
  try {
    logger.info('🔨 Checking if database exists and creating if necessary...');
    
    // Create temporary connection without specifying database
    const connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.username,
      password: config.db.password,
      charset: 'utf8mb4', // Support for full Unicode including emojis
      timezone: config.db.timezone,
    });

    // Execute database creation query
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` 
      DEFAULT CHARACTER SET utf8mb4 
      DEFAULT COLLATE utf8mb4_unicode_ci`);
    
    // Log success with timing
    const duration = Date.now() - startTime;
    logDatabase('CREATE_DATABASE', config.db.database, duration);
    logger.info(`🛢️ Database "${config.db.database}" is ready and available`);
    
    // Close the temporary connection
    await connection.end();
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logDatabase('CREATE_DATABASE', config.db.database, duration, error);
    logger.error(`❌ Failed to create/verify database: ${error.message}`, {
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      host: config.db.host,
      database: config.db.database
    });
    throw error;
  }
};

/**
 * Sequelize Instance Configuration
 * --------------------------------
 * Creates a production-ready Sequelize instance with comprehensive configuration
 * including connection pooling, retry logic, and performance optimizations.
 */
export const sequelize = new Sequelize(
  config.db.database,
  config.db.username,
  config.db.password,
  {
    // Connection Configuration
    host: config.db.host,
    port: config.db.port,
    dialect: 'mysql',
    timezone: config.db.timezone,
    
    // Logging Configuration
    logging: config.db.logging ? (sql: string) => logger.debug(sql) : false,
    
    // Connection Pool Configuration
    pool: {
      max: config.db.pool.max,           // Maximum connections
      min: config.db.pool.min,           // Minimum connections
      acquire: config.db.pool.acquire,   // Max time to get connection
      idle: config.db.pool.idle,         // Max idle time
      evict: 10000,                      // Check for idle connections every 10 seconds
    },
    
    // Retry Configuration
    retry: {
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ESOCKETTIMEDOUT/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
      ],
      max: 3, // Maximum number of retries
    },
    
    // Model Definition Defaults
    define: {
      timestamps: false,         // We handle timestamps manually in each model
      underscored: false,        // We define column names explicitly in models
      freezeTableName: true,     // Prevent Sequelize from pluralizing table names
      charset: 'utf8mb4',        // Support full Unicode
      collate: 'utf8mb4_unicode_ci',
      paranoid: false,           // Set to true if you want soft deletes
    },
    
    // Query Configuration
    benchmark: config.isDevelopment, // Log query execution time in development
    minifyAliases: config.isProduction, // Minify aliases in production
    
    // SSL Configuration (enable in production if needed)
    dialectOptions: {
      charset: 'utf8mb4',
      dateStrings: true,
      typeCast: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      // ssl: config.isProduction ? {
      //   require: true,
      //   rejectUnauthorized: false
      // } : false,
    },
  }
);

/**
 * Database Connection Function
 * ---------------------------
 * Establishes connection to the database with comprehensive error handling
 * and automatic retry logic.
 * 
 * @returns Promise<void> - Resolves when connection is established
 * @throws Error if all connection attempts fail
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    // Step 1: Ensure database exists
    await createDatabase();
    
    // Step 2: Attempt to connect with retry logic
    logSystem('DATABASE_CONNECTION_START', {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      username: config.db.username
    });
    
    await retryDatabaseConnection();
    
    logSystem('DATABASE_CONNECTION_SUCCESS', {
      host: config.db.host,
      database: config.db.database,
      pool: config.db.pool
    });
    
    logger.info('✅ Database connection established successfully');
    
  } catch (error: any) {
    logSystem('DATABASE_CONNECTION_FAILED', {
      error: error.message,
      host: config.db.host,
      database: config.db.database
    });
    
    logger.error(`❌ Failed to connect to database: ${error.message}`, {
      error: error.message,
      code: error.code,
      host: config.db.host,
      database: config.db.database
    });
    
    throw error;
  }
};

/**
 * Database Schema Synchronization
 * ------------------------------
 * Synchronizes Sequelize models with the database schema.
 * Uses alter mode to update existing tables without data loss.
 * 
 * @param options - Synchronization options
 * @returns Promise<void> - Resolves when sync is complete
 */
export const syncDatabase = async (options: {
  force?: boolean;
  alter?: boolean;
  logging?: boolean;
} = {}): Promise<void> => {
  const timer = new PerformanceTimer('databaseSync');
  const startTime = Date.now();
  
  try {
    const syncOptions = {
      force: options.force || false,        // Don't drop existing tables
      alter: options.alter !== false,      // Allow schema alterations
      logging: false,                       // Disable schema sync SQL logging
    };
    
    const modelCount = Object.keys(sequelize.models).length;
    
    logger.info('🔄 Starting database schema synchronization...', {
      options: syncOptions,
      models: modelCount
    });
    
    // Perform the synchronization
    await sequelize.sync(syncOptions);
    
    const duration = Date.now() - startTime;
    
    logSystem('DATABASE_SYNC_SUCCESS', {
      modelCount,
      duration: `${duration}ms`,
      options: syncOptions
    });
    
    // Log performance
    timer.end({ modelCount, options: syncOptions });
    
    logger.info(`✅ Database schema synchronized successfully (${modelCount} models, ${duration}ms)`);
    
    // Log slow sync warning
    if (duration > 5000) {
      logger.warn(`⏰ Database sync took longer than expected: ${duration}ms`, {
        modelCount,
        threshold: '5000ms'
      });
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logDatabase('SCHEMA_SYNC', 'ALL_MODELS', duration, error);
    
    logger.error(`❌ Database schema synchronization failed: ${error.message}`, {
      error: error.message,
      duration: `${duration}ms`,
      models: Object.keys(sequelize.models)
    });
    
    throw error;
  }
};

/**
 * Test Database Connection
 * -----------------------
 * Tests the database connection and returns connection status
 * 
 * @returns Promise<boolean> - True if connection is healthy
 */
export const testConnection = async (): Promise<boolean> => {
  const timer = new PerformanceTimer('databaseConnectionTest');
  
  try {
    logger.debug('🔍 Testing database connection...');
    await sequelize.authenticate();
    
    const duration = timer.end();
    logger.info('✅ Database connection test passed', {
      duration: `${duration}ms`
    });
    
    return true;
  } catch (error: any) {
    const duration = timer.end({ error: error.message });
    logger.error(`❌ Database connection test failed: ${error.message}`, {
      duration: `${duration}ms`,
      error: error.message
    });
    return false;
  }
};

/**
 * Close Database Connection
 * ------------------------
 * Gracefully closes all database connections
 * 
 * @returns Promise<void> - Resolves when all connections are closed
 */
export const closeDatabase = async (): Promise<void> => {
  const timer = new PerformanceTimer('databaseClose');
  
  try {
    logger.info('🔒 Closing database connections...');
    await sequelize.close();
    
    const duration = timer.end();
    logSystem('DATABASE_CONNECTION_CLOSED', { duration: `${duration}ms` });
    logger.info('✅ Database connections closed successfully', {
      duration: `${duration}ms`
    });
  } catch (error: any) {
    const duration = timer.end({ error: error.message });
    logger.error(`❌ Error closing database connections: ${error.message}`, {
      duration: `${duration}ms`,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get Database Info
 * ----------------
 * Returns information about the current database configuration and status
 * 
 * @returns Database information object
 */
export const getDatabaseInfo = () => {
  return {
    dialect: sequelize.getDialect(),
    database: sequelize.getDatabaseName(),
    host: sequelize.config.host,
    port: sequelize.config.port,
    pool: {
      max: sequelize.config.pool?.max,
      min: sequelize.config.pool?.min,
      idle: sequelize.config.pool?.idle,
      acquire: sequelize.config.pool?.acquire,
    },
    models: Object.keys(sequelize.models),
    modelCount: Object.keys(sequelize.models).length,
  };
};

// Export sequelize instance as default for model definitions
export default sequelize;
