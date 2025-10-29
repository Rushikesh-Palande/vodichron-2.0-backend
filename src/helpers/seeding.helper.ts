/**
 * Seeding Helper Functions
 * ========================
 * Provides utility functions for database seeding operations.
 * Includes safe seeding with duplicate checking and error handling.
 */

import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

/**
 * Hash a plain text password using bcrypt
 * @param plainPassword - The plain text password to hash
 * @returns The hashed password
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    return hashedPassword;
  } catch (error: any) {
    logger.error('Error hashing password:', {
      error: error.message,
      type: 'PASSWORD_HASH_ERROR'
    });
    throw error;
  }
}

/**
 * Safe seeding wrapper that checks if record exists before creating
 * @param modelName - Name of the model (for logging)
 * @param model - Sequelize model
 * @param checkCondition - Condition to check if record exists
 * @param data - Data to create if record doesn't exist
 * @param identifierField - Field name to use in log messages
 * @returns The created or existing record
 */
export async function seedRecordSafe<T>(
  modelName: string,
  model: any,
  checkCondition: any,
  data: any,
  identifierField: string = 'uuid'
): Promise<T | null> {
  try {
    // Check if record already exists
    const existingRecord = await model.findOne({ where: checkCondition });

    if (existingRecord) {
      logger.info(`✓ ${modelName} already exists`, {
        [identifierField]: existingRecord[identifierField],
        type: 'SEED_SKIP'
      });
      return existingRecord;
    }

    // Create new record
    const newRecord = await model.create(data);
    logger.info(`✓ ${modelName} created successfully`, {
      [identifierField]: newRecord[identifierField],
      type: 'SEED_CREATE'
    });

    return newRecord;
  } catch (error: any) {
    logger.error(`✗ Failed to seed ${modelName}:`, {
      error: error.message,
      stack: error.stack,
      type: 'SEED_ERROR'
    });
    throw error;
  }
}

/**
 * Validates required fields in seed data
 * @param data - The data object to validate
 * @param requiredFields - Array of required field names
 * @param recordName - Name of the record type (for error messages)
 * @throws Error if any required field is missing
 */
export function validateSeedData(
  data: any,
  requiredFields: string[],
  recordName: string
): void {
  const missingFields = requiredFields.filter(field => !data[field]);

  if (missingFields.length > 0) {
    const errorMessage = `Missing required fields in ${recordName}: ${missingFields.join(', ')}`;
    logger.error(errorMessage, {
      missingFields,
      type: 'SEED_VALIDATION_ERROR'
    });
    throw new Error(errorMessage);
  }
}
