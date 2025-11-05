/**
 * Get Master Data Service
 * ========================
 * Business logic for fetching master data configuration
 * 
 * Pattern: Service layer contains business logic and orchestrates store calls
 * Based on: old vodichron masterDataController.get
 */

import { TRPCError } from '@trpc/server';
import { logger } from '../../../utils/logger';
import { getAllMasterFields } from '../stores/master-data.store';
import type { MasterField } from '../types/master-data.types';

/**
 * Get Master Data
 * ===============
 * Main service function for fetching all master data configuration
 * 
 * Process:
 * 1. Call store to fetch all master fields from database
 * 2. Return formatted response
 * 
 * Features:
 * - Returns all master data in single call
 * - Used for populating dropdowns (designation, department, etc.)
 * - Frontend typically caches this data
 * - No input required - returns all available master data
 * 
 * Use Cases:
 * - Employee registration form (designation, department dropdowns)
 * - Leave application form (leave type dropdown)
 * - Any form requiring system configuration data
 * 
 * @returns Array of master fields with name and values
 * @throws TRPCError if fetching fails
 */
export async function getMasterData(): Promise<MasterField[]> {
  try {
    logger.info('📋 Get master data service started', {
      operation: 'getMasterData_service'
    });

    // ==========================================================================
    // STEP 1: Fetch Master Data from Database
    // ==========================================================================
    // Call store to get all master fields
    // No filtering or transformation needed - return all data
    const masterFields = await getAllMasterFields();

    logger.info('✅ Get master data service completed', {
      fieldsCount: masterFields.length,
      fieldNames: masterFields.map(f => f.name),
      operation: 'getMasterData_service'
    });

    // ==========================================================================
    // STEP 2: Return Master Data
    // ==========================================================================
    return masterFields;

  } catch (error) {
    // ==========================================================================
    // STEP 3: Error Handling
    // ==========================================================================
    logger.error('💥 Get master data service error', {
      type: 'GET_MASTER_DATA_SERVICE_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Re-throw TRPCError as-is
    if (error instanceof TRPCError) {
      throw error;
    }

    // Wrap other errors in TRPCError
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch master data configuration',
      cause: error
    });
  }
}
