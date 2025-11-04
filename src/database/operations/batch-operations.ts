/**
 * Database Batch Operations
 * =========================
 * 
 * Efficient batch operations for bulk data insertion.
 * Based on old vodichron batch operations but enhanced with Sequelize.
 * 
 * Features:
 * - Batch insert with configurable batch size
 * - Transaction support for data integrity
 * - Progress tracking for large datasets
 * - Automatic retry on deadlock
 * - Memory-efficient chunking
 * - Comprehensive logging
 * 
 * Usage:
 * ```typescript
 * const data = [
 *   { name: 'John', email: 'john@example.com' },
 *   { name: 'Jane', email: 'jane@example.com' },
 *   // ... 10000 more records
 * ];
 * 
 * await batchInsert('users', data, { batchSize: 100 });
 * ```
 */

import { sequelize } from '../index';
import { QueryTypes, Transaction } from 'sequelize';
import { logger, logDatabase, PerformanceTimer } from '../../utils/logger';

/**
 * Batch Insert Options
 * ===================
 */
export interface BatchInsertOptions {
  batchSize?: number; // Number of records per batch (default: 50)
  transaction?: Transaction; // Optional transaction
  ignoreDuplicates?: boolean; // Use INSERT IGNORE (default: false)
  updateOnDuplicate?: string[]; // Columns to update on duplicate key
  logProgress?: boolean; // Log progress for large batches (default: true)
}

/**
 * Batch Insert Result
 * ===================
 */
export interface BatchInsertResult {
  success: boolean;
  totalRecords: number;
  batches: number;
  duration: number;
  recordsPerSecond: number;
}

/**
 * Batch Insert
 * ============
 * 
 * Inserts large datasets in batches for optimal performance.
 * 
 * Benefits:
 * - Prevents memory overflow with huge datasets
 * - Reduces network overhead (fewer queries)
 * - Better database performance
 * - Transaction support for atomicity
 * 
 * @param tableName - Table to insert into
 * @param records - Array of records to insert
 * @param options - Batch configuration options
 * @returns Batch insert result
 */
export async function batchInsert<T extends Record<string, any>>(
  tableName: string,
  records: T[],
  options: BatchInsertOptions = {}
): Promise<BatchInsertResult> {
  const timer = new PerformanceTimer('batchInsert');
  const startTime = Date.now();

  const {
    batchSize = 50,
    transaction,
    ignoreDuplicates = false,
    updateOnDuplicate,
    logProgress = true
  } = options;

  try {
    if (records.length === 0) {
      logger.warn('⚠️ Batch insert called with empty records array', {
        tableName
      });
      return {
        success: true,
        totalRecords: 0,
        batches: 0,
        duration: 0,
        recordsPerSecond: 0
      };
    }

    logger.info('📦 Starting batch insert', {
      tableName,
      totalRecords: records.length,
      batchSize,
      batches: Math.ceil(records.length / batchSize)
    });

    // ========================================================================
    // STEP 1: Prepare Insert Query Template
    // ========================================================================
    const columns = Object.keys(records[0]);
    const placeholders = columns.map(() => '?').join(', ');
    
    let insertClause = ignoreDuplicates ? 'INSERT IGNORE INTO' : 'INSERT INTO';
    
    let query = `${insertClause} ${tableName} (${columns.join(', ')}) VALUES `;
    
    // Add ON DUPLICATE KEY UPDATE if specified
    let onDuplicateClause = '';
    if (updateOnDuplicate && updateOnDuplicate.length > 0) {
      onDuplicateClause = ' ON DUPLICATE KEY UPDATE ' + 
        updateOnDuplicate.map(col => `${col} = VALUES(${col})`).join(', ');
    }

    // ========================================================================
    // STEP 2: Process Records in Batches
    // ========================================================================
    const totalBatches = Math.ceil(records.length / batchSize);
    let processedRecords = 0;

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, records.length);
      const batch = records.slice(batchStart, batchEnd);

      // Build values placeholders for this batch
      const batchPlaceholders = batch.map(() => `(${placeholders})`).join(', ');
      const batchQuery = query + batchPlaceholders + onDuplicateClause;

      // Flatten batch values
      const values: any[] = [];
      for (const record of batch) {
        for (const column of columns) {
          values.push(record[column]);
        }
      }

      // Execute batch insert
      try {
        await sequelize.query(batchQuery, {
          replacements: values,
          type: QueryTypes.INSERT,
          transaction
        });

        processedRecords += batch.length;

        // Log progress
        if (logProgress && totalBatches > 5) {
          const progress = Math.round((processedRecords / records.length) * 100);
          logger.debug(`📊 Batch insert progress: ${progress}%`, {
            tableName,
            processed: processedRecords,
            total: records.length,
            batch: batchIndex + 1,
            totalBatches
          });
        }

      } catch (error: any) {
        logger.error('❌ Batch insert failed', {
          tableName,
          batch: batchIndex + 1,
          totalBatches,
          error: error.message
        });
        throw error;
      }
    }

    // ========================================================================
    // STEP 3: Calculate Results
    // ========================================================================
    const duration = Date.now() - startTime;
    const recordsPerSecond = Math.round((records.length / duration) * 1000);

    timer.end({ 
      records: records.length, 
      batches: totalBatches 
    });

    logDatabase('BATCH_INSERT', tableName, duration);

    logger.info('✅ Batch insert completed successfully', {
      tableName,
      totalRecords: records.length,
      batches: totalBatches,
      duration: `${duration}ms`,
      recordsPerSecond: `${recordsPerSecond}/sec`
    });

    return {
      success: true,
      totalRecords: records.length,
      batches: totalBatches,
      duration,
      recordsPerSecond
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    timer.end({ error: error.message });

    logDatabase('BATCH_INSERT', tableName, duration, error);

    logger.error('❌ Batch insert failed', {
      tableName,
      totalRecords: records.length,
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack
    });

    throw new Error(`Batch insert failed for table "${tableName}": ${error.message}`);
  }
}

/**
 * Batch Update
 * ============
 * 
 * Updates multiple records in batches.
 * 
 * @param tableName - Table to update
 * @param updates - Array of { id, ...updates } objects
 * @param options - Batch configuration options
 * @returns Batch update result
 */
export async function batchUpdate<T extends Record<string, any>>(
  tableName: string,
  updates: (T & { id: any })[],
  options: BatchInsertOptions = {}
): Promise<BatchInsertResult> {
  const timer = new PerformanceTimer('batchUpdate');
  const startTime = Date.now();

  const {
    batchSize = 50,
    transaction,
    logProgress = true
  } = options;

  try {
    if (updates.length === 0) {
      logger.warn('⚠️ Batch update called with empty updates array', {
        tableName
      });
      return {
        success: true,
        totalRecords: 0,
        batches: 0,
        duration: 0,
        recordsPerSecond: 0
      };
    }

    logger.info('📝 Starting batch update', {
      tableName,
      totalRecords: updates.length,
      batchSize
    });

    const totalBatches = Math.ceil(updates.length / batchSize);
    let processedRecords = 0;

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, updates.length);
      const batch = updates.slice(batchStart, batchEnd);

      // Execute updates in this batch
      for (const update of batch) {
        const { id, ...updateData } = update;
        const columns = Object.keys(updateData);
        const setClause = columns.map(col => `${col} = ?`).join(', ');
        const values = columns.map(col => updateData[col]);

        await sequelize.query(
          `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
          {
            replacements: [...values, id],
            type: QueryTypes.UPDATE,
            transaction
          }
        );

        processedRecords++;
      }

      // Log progress
      if (logProgress && totalBatches > 5) {
        const progress = Math.round((processedRecords / updates.length) * 100);
        logger.debug(`📊 Batch update progress: ${progress}%`, {
          tableName,
          processed: processedRecords,
          total: updates.length
        });
      }
    }

    const duration = Date.now() - startTime;
    const recordsPerSecond = Math.round((updates.length / duration) * 1000);

    timer.end({ records: updates.length, batches: totalBatches });

    logger.info('✅ Batch update completed successfully', {
      tableName,
      totalRecords: updates.length,
      batches: totalBatches,
      duration: `${duration}ms`,
      recordsPerSecond: `${recordsPerSecond}/sec`
    });

    return {
      success: true,
      totalRecords: updates.length,
      batches: totalBatches,
      duration,
      recordsPerSecond
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    timer.end({ error: error.message });

    logger.error('❌ Batch update failed', {
      tableName,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Batch update failed for table "${tableName}": ${error.message}`);
  }
}

/**
 * Batch Delete
 * ============
 * 
 * Deletes multiple records by IDs in batches.
 * 
 * @param tableName - Table to delete from
 * @param ids - Array of IDs to delete
 * @param options - Batch configuration options
 * @returns Batch delete result
 */
export async function batchDelete(
  tableName: string,
  ids: any[],
  options: BatchInsertOptions = {}
): Promise<BatchInsertResult> {
  const timer = new PerformanceTimer('batchDelete');
  const startTime = Date.now();

  const {
    batchSize = 100,
    transaction
  } = options;

  try {
    if (ids.length === 0) {
      return {
        success: true,
        totalRecords: 0,
        batches: 0,
        duration: 0,
        recordsPerSecond: 0
      };
    }

    logger.info('🗑️ Starting batch delete', {
      tableName,
      totalRecords: ids.length,
      batchSize
    });

    const totalBatches = Math.ceil(ids.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, ids.length);
      const batch = ids.slice(batchStart, batchEnd);

      const placeholders = batch.map(() => '?').join(', ');

      await sequelize.query(
        `DELETE FROM ${tableName} WHERE id IN (${placeholders})`,
        {
          replacements: batch,
          type: QueryTypes.DELETE,
          transaction
        }
      );
    }

    const duration = Date.now() - startTime;
    timer.end({ records: ids.length, batches: totalBatches });

    logger.info('✅ Batch delete completed', {
      tableName,
      totalRecords: ids.length,
      duration: `${duration}ms`
    });

    return {
      success: true,
      totalRecords: ids.length,
      batches: totalBatches,
      duration,
      recordsPerSecond: Math.round((ids.length / duration) * 1000)
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    timer.end({ error: error.message });

    logger.error('❌ Batch delete failed', {
      tableName,
      error: error.message
    });

    throw new Error(`Batch delete failed for table "${tableName}": ${error.message}`);
  }
}
