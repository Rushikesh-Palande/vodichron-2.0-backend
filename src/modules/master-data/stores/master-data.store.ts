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
