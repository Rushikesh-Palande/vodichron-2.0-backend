/**
 * Database Reset Script
 * =====================
 * Cleans all data from the database while preserving table structure
 * 
 * Usage:
 * - Development: npm run reset:db
 * - Direct: ts-node src/scripts/reset-database.ts
 * 
 * Features:
 * - Truncates all tables in correct order (respects foreign keys)
 * - Preserves table schema and structure
 * - Comprehensive logging
 * - Confirmation prompt for safety
 * - Error handling and rollback
 */

import { sequelize } from '../database';
import { logger } from '../utils/logger';
import * as readline from 'readline';

/**
 * Get Table Names in Dependency Order
 * ------------------------------------
 * Returns all table names sorted by their dependencies
 * to avoid foreign key constraint violations
 */
async function getTableNamesInOrder(): Promise<string[]> {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  
  // Define dependency order manually to avoid FK constraint errors
  // Tables with no dependencies first, then tables that depend on them
  const dependencyOrder = [
    // Core independent tables
    'master_data',
    'application_logs',
    'cron_jobs',
    'password_reset_tokens',
    
    // Employee and user tables (users depend on employees)
    'users',
    'employees',
    
    // Tables that depend on employees
    'employee_education',
    'employee_experience',
    'employee_leave_allocation',
    'employee_leave_balance',
    'employee_leave_transaction',
    'employee_weekly_timesheet',
    'employee_daily_timesheet',
    'employee_notifications',
    'employee_files',
    
    // Attendance tables
    'employee_attendance',
    'employee_attendance_regularization',
    'employee_attendance_manual_adjustment',
    
    // Holiday and leave tables
    'holidays',
    'leave_types',
    'leave_requests',
    
    // Other tables
    'departments',
    'designations',
  ];
  
  // Filter to only include tables that exist
  const existingTables = tables.filter((table: string) => 
    dependencyOrder.includes(table)
  );
  
  // Add any remaining tables that aren't in dependency order
  const remainingTables = tables.filter((table: string) => 
    !dependencyOrder.includes(table)
  );
  
  return [...existingTables, ...remainingTables];
}

/**
 * Truncate All Tables
 * -------------------
 * Truncates all tables in the database in the correct order
 */
async function truncateAllTables(): Promise<void> {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('🔄 Starting database reset operation...');
    
    // Disable foreign key checks temporarily
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
    logger.debug('🔓 Foreign key checks disabled');
    
    // Get all table names in dependency order
    const tableNames = await getTableNamesInOrder();
    logger.info(`📋 Found ${tableNames.length} tables to truncate`);
    
    let truncatedCount = 0;
    
    // Truncate each table
    for (const tableName of tableNames) {
      try {
        await sequelize.query(`TRUNCATE TABLE \`${tableName}\``, { transaction });
        truncatedCount++;
        logger.info(`✅ Truncated table: ${tableName}`);
      } catch (error: any) {
        logger.warn(`⚠️  Failed to truncate ${tableName}: ${error.message}`);
        // Continue with other tables even if one fails
      }
    }
    
    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
    logger.debug('🔒 Foreign key checks re-enabled');
    
    // Commit transaction
    await transaction.commit();
    
    logger.info(`✅ Database reset completed successfully`);
    logger.info(`📊 Statistics: ${truncatedCount}/${tableNames.length} tables truncated`);
    
  } catch (error: any) {
    // Rollback on error
    await transaction.rollback();
    logger.error(`❌ Database reset failed: ${error.message}`);
    throw error;
  }
}

/**
 * Prompt User for Confirmation
 * ----------------------------
 * Asks user to confirm before proceeding with reset
 */
async function promptConfirmation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  WARNING: This will DELETE ALL DATA from the database!\n' +
      '   Table structure will be preserved, but all records will be removed.\n\n' +
      '   Are you sure you want to continue? (yes/no): ',
      (answer: string) => {
        rl.close();
        resolve(answer.toLowerCase().trim() === 'yes');
      }
    );
  });
}

/**
 * Main Execution
 * --------------
 * Entry point for the reset script
 */
async function main() {
  try {
    console.log('\n🔧 Database Reset Script');
    console.log('========================\n');
    
    // Connect to database
    logger.info('🔌 Connecting to database...');
    await sequelize.authenticate();
    logger.info('✅ Database connection established');
    
    // Display database info
    const dbName = sequelize.getDatabaseName();
    const host = sequelize.config.host;
    logger.info(`📊 Target database: ${dbName} @ ${host}`);
    
    // Prompt for confirmation
    const confirmed = await promptConfirmation();
    
    if (!confirmed) {
      logger.info('❌ Database reset cancelled by user');
      process.exit(0);
    }
    
    // Perform reset
    logger.info('\n🚀 Starting database reset...\n');
    await truncateAllTables();
    
    console.log('\n✨ Database reset completed successfully!\n');
    process.exit(0);
    
  } catch (error: any) {
    logger.error(`❌ Fatal error: ${error.message}`, {
      error: error.message,
      stack: error.stack,
    });
    console.error('\n❌ Database reset failed. Check logs for details.\n');
    process.exit(1);
  } finally {
    // Close database connection
    try {
      await sequelize.close();
      logger.info('🔌 Database connection closed');
    } catch {
      // Ignore close errors
    }
  }
}

// Run the script
main();
