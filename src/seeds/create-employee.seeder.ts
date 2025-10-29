/**
 * Employee Seeder
 * ===============
 * Seeds the default super user employee record.
 * Ensures the system has at least one employee for the super user account.
 */

import Employee from '../models/employee.model';
import { DEFAULT_SUPER_USER_EMPLOYEE } from '../constants/seed-data.constants';
import { seedRecordSafe, validateSeedData } from '../helpers/seeding.helper';
import { logger } from '../utils/logger';

/**
 * Seed the default super user employee
 * Creates an employee record if it doesn't already exist
 */
export async function seedDefaultEmployee(): Promise<void> {
  try {
    logger.info('📋 Seeding default super user employee...');

    // Validate seed data
    validateSeedData(
      DEFAULT_SUPER_USER_EMPLOYEE,
      ['uuid', 'name', 'gender', 'contactNumber', 'employeeId'],
      'Default Super User Employee'
    );

    // Seed the employee record
    await seedRecordSafe(
      'Default Super User Employee',
      Employee,
      { uuid: DEFAULT_SUPER_USER_EMPLOYEE.uuid },
      DEFAULT_SUPER_USER_EMPLOYEE,
      'employeeId'
    );

    logger.info('✅ Default employee seeding completed');
  } catch (error: any) {
    logger.error('💥 Failed to seed default employee:', {
      error: error.message,
      stack: error.stack,
      type: 'EMPLOYEE_SEED_ERROR'
    });
    throw error;
  }
}

/**
 * Safe wrapper for employee seeding
 * Catches and logs errors without stopping server startup
 */
export async function seedDefaultEmployeeSafe(): Promise<void> {
  try {
    await seedDefaultEmployee();
  } catch (error: any) {
    logger.error('Employee seeding failed, but continuing...', {
      error: error.message,
      type: 'EMPLOYEE_SEED_SAFE_ERROR'
    });
    // Don't re-throw - allow server to continue
  }
}
