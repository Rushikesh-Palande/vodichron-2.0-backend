/**
 * Master Seed Runner for Vodichron System
 * ========================================
 * Executes all seed scripts when the server starts.
 * Ensures database tables are populated with essential data.
 */

import { seedDefaultEmployeeSafe } from './create-employee.seeder';
import { seedDefaultUserSafe } from './create-user.seeder';
import { seedMasterDataSafe } from '../modules/master-data/seeds/create-master-data.seeder';
import { logger } from '../utils/logger';

/**
 * Runs all seed scripts in sequence
 * Called during server startup to ensure database is properly seeded
 */
export async function runAllSeeds(): Promise<void> {
  logger.info('🌱 Starting Vodichron System database seeding process...');
  logger.info('');
  
  try {
    // Step 1: Seed master data FIRST (departments, designations, etc.)
    logger.info('🗂️  Step 1: Seeding application master data...');
    await seedMasterDataSafe();
    logger.info('✅ Step 1: Master data seeding completed');
    logger.info('');

    // Step 2: Seed default employee (user depends on employee)
    logger.info('📋 Step 2: Seeding default employee...');
    await seedDefaultEmployeeSafe();
    logger.info('✅ Step 2: Employee seeding completed');
    logger.info('');

    // Step 3: Seed default super user (references employee)
    logger.info('👤 Step 3: Seeding default super user...');
    await seedDefaultUserSafe();
    logger.info('✅ Step 3: Super user seeding completed');
    logger.info('');
    
    logger.info('🎉 Vodichron System database seeding completed successfully!');
    logger.info('');
    logger.info('📝 Default Credentials:');
    logger.info('   Email: rushikesh@embedsquare.com');
    logger.info('   Password: Embed@123');
    logger.info('');
    
  } catch (error: any) {
    logger.error('💥 Vodichron System database seeding failed:', {
      error: error.message,
      stack: error.stack,
      type: 'DATABASE_SEEDING_ERROR'
    });
    throw error; // Re-throw to prevent server startup with incomplete data
  }
}

/**
 * Individual seed exports for selective seeding if needed
 */
export {
  seedMasterDataSafe,
  seedDefaultEmployeeSafe,
  seedDefaultUserSafe
};
