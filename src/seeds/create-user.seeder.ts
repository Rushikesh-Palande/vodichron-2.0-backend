/**
 * User Seeder
 * ===========
 * Seeds the default super user account.
 * Ensures the system has at least one admin user for initial login.
 */

import User from '../models/user.model';
import { DEFAULT_SUPER_USER } from '../constants/seed-data.constants';
import { seedRecordSafe, validateSeedData, hashPassword } from '../helpers/seeding.helper';
import { logger } from '../utils/logger';

/**
 * Seed the default super user account
 * Creates a super user account if it doesn't already exist
 * Password is hashed before storing
 */
export async function seedDefaultUser(): Promise<void> {
  try {
    logger.info('👤 Seeding default super user account...');

    // Validate seed data
    validateSeedData(
      DEFAULT_SUPER_USER,
      ['uuid', 'employeeId', 'role', 'plainPassword'],
      'Default Super User'
    );

    // Hash the password
    const hashedPassword = await hashPassword(DEFAULT_SUPER_USER.plainPassword);

    // Prepare user data with hashed password
    const userData = {
      uuid: DEFAULT_SUPER_USER.uuid,
      employeeId: DEFAULT_SUPER_USER.employeeId,
      role: DEFAULT_SUPER_USER.role,
      password: hashedPassword,
      status: DEFAULT_SUPER_USER.status,
      createdBy: DEFAULT_SUPER_USER.createdBy,
      updatedBy: DEFAULT_SUPER_USER.updatedBy,
      isSystemGenerated: DEFAULT_SUPER_USER.isSystemGenerated,
      lastLogin: DEFAULT_SUPER_USER.lastLogin,
    };

    // Seed the user record
    await seedRecordSafe(
      'Default Super User',
      User,
      { uuid: DEFAULT_SUPER_USER.uuid },
      userData,
      'role'
    );

    logger.info('✅ Default user seeding completed');
  } catch (error: any) {
    logger.error('💥 Failed to seed default user:', {
      error: error.message,
      stack: error.stack,
      type: 'USER_SEED_ERROR'
    });
    throw error;
  }
}

/**
 * Safe wrapper for user seeding
 * Catches and logs errors without stopping server startup
 */
export async function seedDefaultUserSafe(): Promise<void> {
  try {
    await seedDefaultUser();
  } catch (error: any) {
    logger.error('User seeding failed, but continuing...', {
      error: error.message,
      type: 'USER_SEED_SAFE_ERROR'
    });
    // Don't re-throw - allow server to continue
  }
}
