/**
 * Master Data Seeder
 * ==================
 * Seeds the application master data (departments, designations).
 * Ensures the system has essential dropdown data for employee registration.
 * 
 * This seeder populates the application_master_data table with:
 * - Departments: Engineering, Marketing, HR, Finance, etc.
 * - Designations: Software Engineer, Manager, Director, etc.
 */

import MasterData from '../../../models/master-data.model';
import { logger } from '../../../utils/logger';
import { SYSTEM_USER } from '../../../constants/seed-data.constants';

/**
 * Master Data Configuration
 * -------------------------
 * Defines the initial master data to be seeded into the database.
 * Based on old Vodichron migration 00022-insert-initial-fields.js
 */
const MASTER_DATA_SEEDS = [
  {
    name: 'department',
    value: [
      'Engineering',
      'Marketing',
      'Human Resource',
      'House Keeping',
      'Finance',
      'Administration',
      'Other'
    ]
  },
  {
    name: 'designation',
    value: [
      'Junior Engineer',
      'Software Engineer',
      'Senior Software Engineer',
      'Manager',
      'Senior Manager',
      'Designer',
      'Tester',
      'Consultant',
      'Senior Consultant',
      'Director',
      'HR Executive',
      'PHP Developer-Laravel Specialist',
      'Technical Support',
      'Hardware Architect',
      'Operations Executive',
      'Super Administrator',
      'Other'
    ]
  }
];

/**
 * Seed Master Data
 * ----------------
 * Creates or updates master data records in the database.
 * Uses upsert to avoid duplicate entries.
 */
export async function seedMasterData(): Promise<void> {
  try {
    logger.info('🗂️  Seeding application master data...');

    for (const masterDataItem of MASTER_DATA_SEEDS) {
      logger.info(`   → Processing: ${masterDataItem.name}`);

      // Check if this master data already exists
      const existing = await MasterData.findOne({
        where: { name: masterDataItem.name }
      });

      if (existing) {
        logger.info(`   ⚠️  ${masterDataItem.name} already exists, skipping...`);
        continue;
      }

      // Create new master data record
      await MasterData.create({
        name: masterDataItem.name,
        value: masterDataItem.value,
        createdBy: SYSTEM_USER,
        updatedBy: SYSTEM_USER,
      });

      logger.info(`   ✅ ${masterDataItem.name} seeded successfully`);
    }

    logger.info('✅ Master data seeding completed');
  } catch (error: any) {
    logger.error('💥 Failed to seed master data:', {
      error: error.message,
      stack: error.stack,
      type: 'MASTER_DATA_SEED_ERROR'
    });
    throw error;
  }
}

/**
 * Safe wrapper for master data seeding
 * -------------------------------------
 * Catches and logs errors without stopping server startup.
 * Allows the application to continue even if seeding fails.
 */
export async function seedMasterDataSafe(): Promise<void> {
  try {
    await seedMasterData();
  } catch (error: any) {
    logger.error('Master data seeding failed, but continuing...', {
      error: error.message,
      type: 'MASTER_DATA_SEED_SAFE_ERROR'
    });
    // Don't re-throw - allow server to continue
  }
}
