/**
 * Master Data Store
 * =================
 * Database queries for master data operations
 * 
 * Pattern: Store layer handles all direct database interactions
 * Based on: old vodichron getAllMasterField
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../utils/logger';
import type { MasterField } from '../types/master-data.types';

/**
 * Get All Master Fields
 * =====================
 * Fetches all master data configuration from database
 * 
 * Database Query Structure:
 * ------------------------
 * SELECT: uuid, name, value, createdAt, createdBy, updatedAt, updatedBy
 * FROM: application_master_data
 * ORDER BY: name ASC (for consistent ordering)
 * 
 * Features:
 * - Returns all master data fields in one query
 * - Parses JSON value field automatically
 * - Used for dropdowns and configuration across the app
 * - Cached on frontend for performance
 * 
 * Performance:
 * - Small dataset (typically < 50 rows)
 * - No JOINs needed
 * - Indexed on 'name' field
 * - Fast query execution (< 10ms expected)
 * 
 * @returns Array of master fields with name and value
 */
export async function getAllMasterFields(): Promise<MasterField[]> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('getAllMasterFields');

  try {
    logger.info('📋 Fetching all master data fields', {
      operation: 'getAllMasterFields_store'
    });

    // ==========================================================================
    // STEP 2: Construct SQL Query
    // ==========================================================================
    // Select all fields from application_master_data table
    // Order by name for consistent results
    const sql = `
      SELECT 
        uuid,
        name,
        value,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy
      FROM application_master_data
      ORDER BY name ASC
    `;

    // ==========================================================================
    // STEP 3: Execute Database Query
    // ==========================================================================
    const result = await sequelize.query<{
      uuid: string;
      name: string;
      value: string[] | string; // JSON can be auto-parsed by Sequelize or string
      createdAt: Date;
      createdBy: string;
      updatedAt: Date | null;
      updatedBy: string | null;
    }>(sql, {
      type: QueryTypes.SELECT,
      raw: true,
    });

    // ==========================================================================
    // STEP 4: Stop Timer and Log Performance
    // ==========================================================================
    const duration = timer.end();
    logDatabase('SELECT_ALL_MASTER_FIELDS', 'all', duration);

    logger.info('✅ Master data fields fetched successfully', {
      fieldsCount: result.length,
      duration: `${duration}ms`,
      operation: 'getAllMasterFields_store'
    });

    // ==========================================================================
    // STEP 5: Transform Data
    // ==========================================================================
    // Sequelize auto-parses JSON columns, so check if value is already an array
    const masterFields: MasterField[] = result.map(row => ({
      name: row.name,
      value: Array.isArray(row.value) ? row.value : JSON.parse(row.value || '[]') as string[]
    }));

    logger.debug('🔄 Master data transformed', {
      fields: masterFields.map(f => f.name),
      operation: 'getAllMasterFields_store'
    });

    return masterFields;

  } catch (error) {
    // ==========================================================================
    // STEP 6: Error Handling
    // ==========================================================================
    const duration = timer.end();
    const errorObj = error instanceof Error ? error : undefined;
    logDatabase('SELECT_MASTER_FIELDS_ERROR', 'all', duration, errorObj);

    logger.error('💥 Failed to fetch master data from database', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      operation: 'getAllMasterFields_store'
    });

    throw error;
  }
}

/**
 * Update Master Field
 * ===================
 * Updates a single master data field in the database
 * 
 * Based on: old vodichron updateMasterField (appMasterDataStores.ts lines 38-47)
 * 
 * Database Query Structure:
 * ------------------------
 * UPDATE application_master_data
 * SET value = ?, updatedAt = NOW(), updatedBy = ?
 * WHERE name = ?
 * 
 * Features:
 * - Updates by field name (not UUID)
 * - Stringifies value array to JSON
 * - Automatically sets updatedAt timestamp
 * - Records who made the update (updatedBy)
 * 
 * Business Logic:
 * - Does NOT update: uuid, name, createdAt, createdBy
 * - Only updates: value, updatedAt, updatedBy
 * - Used for HR configuration changes
 * 
 * Security:
 * - Service layer must enforce HR/SuperUser authorization
 * - Store layer only handles database operation
 * 
 * @param name - The field name to update (e.g., 'designation')
 * @param value - New array of values for this field
 * @param userId - UUID of user making the update (for audit trail)
 * @returns Number of rows affected (should be 1)
 * @throws Error if update fails
 */
export async function updateMasterField(
  name: string,
  value: string[],
  userId: string
): Promise<number> {
  // ============================================================================
  // STEP 1: Initialize Performance Timer
  // ============================================================================
  const timer = new PerformanceTimer('updateMasterField');

  try {
    logger.info('📝 Updating master data field', {
      fieldName: name,
      valueCount: value.length,
      updatedBy: userId,
      operation: 'updateMasterField_store'
    });

    // ==========================================================================
    // STEP 2: Prepare Data
    // ==========================================================================
    // Stringify value array to JSON format for database storage
    const valueJson = JSON.stringify(value);

    logger.debug('🔄 Value stringified for database', {
      fieldName: name,
      originalLength: value.length,
      jsonLength: valueJson.length,
      operation: 'updateMasterField_store'
    });

    // ==========================================================================
    // STEP 3: Construct SQL Update Query
    // ==========================================================================
    // Matches old code: updateMasterField (line 41)
    // UPDATE application_master_data 
    // SET value = ?, updatedAt = ?, updatedBy = ? 
    // WHERE name = ?
    const sql = `
      UPDATE application_master_data 
      SET 
        value = ?,
        updatedAt = NOW(),
        updatedBy = ?
      WHERE name = ?
    `;

    // ==========================================================================
    // STEP 4: Execute Database Update
    // ==========================================================================
    const [, rowsAffected] = await sequelize.query(sql, {
      replacements: [valueJson, userId, name],
      type: QueryTypes.UPDATE
    });

    // ==========================================================================
    // STEP 5: Stop Timer and Log Performance
    // ==========================================================================
    const duration = timer.end();
    logDatabase('UPDATE_MASTER_FIELD', name, duration);

    logger.info('✅ Master data field updated successfully', {
      fieldName: name,
      rowsAffected,
      duration: `${duration}ms`,
      operation: 'updateMasterField_store'
    });

    // ==========================================================================
    // STEP 6: Validate Update
    // ==========================================================================
    // Should affect exactly 1 row (the matching field)
    if (rowsAffected === 0) {
      logger.warn('⚠️ No rows affected - field may not exist', {
        fieldName: name,
        operation: 'updateMasterField_store'
      });
    } else if (rowsAffected > 1) {
      logger.error('❌ Multiple rows affected - data integrity issue', {
        fieldName: name,
        rowsAffected,
        operation: 'updateMasterField_store'
      });
    }

    return rowsAffected;

  } catch (error) {
    // ==========================================================================
    // STEP 7: Error Handling
    // ==========================================================================
    const duration = timer.end();
    const errorObj = error instanceof Error ? error : undefined;
    logDatabase('UPDATE_MASTER_FIELD_ERROR', name, duration, errorObj);

    logger.error('💥 Failed to update master data field', {
      fieldName: name,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      operation: 'updateMasterField_store'
    });

    throw error;
  }
}
