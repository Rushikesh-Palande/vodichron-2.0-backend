/**
 * Transform Date to YYYY-MM-DD Helper
 * ====================================
 * Converts various date formats to YYYY-MM-DD format required by the database.
 * Handles ISO strings, Date objects, and various string formats from frontend.
 * 
 * @module transform-date-to-yyyy-mm-dd
 */

import { logger } from '../../../utils/logger';

/**
 * Transform Date to YYYY-MM-DD Format
 * ------------------------------------
 * Accepts various date formats and returns standardized YYYY-MM-DD string.
 * 
 * Supported formats:
 * - ISO 8601: "2025-11-11T12:30:00.000Z"
 * - YYYY-MM-DD: "2025-11-11" (pass-through)
 * - Date object: new Date()
 * - DD/MM/YYYY: "11/11/2025"
 * - MM/DD/YYYY: "11/11/2025"
 * 
 * @param value - Date in any supported format, null, or undefined
 * @returns Date string in YYYY-MM-DD format, or null if input is null/undefined
 * 
 * @example
 * transformDateToYYYYMMDD('2025-11-11T12:30:00.000Z') // '2025-11-11'
 * transformDateToYYYYMMDD('11/11/2025') // '2025-11-11'
 * transformDateToYYYYMMDD(new Date()) // '2025-11-11'
 * transformDateToYYYYMMDD(null) // null
 */
export function transformDateToYYYYMMDD(value: string | Date | null | undefined): string | null {
  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return null;
  }

  try {
    // If already in YYYY-MM-DD format, return as-is
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // Convert to Date object
    let date: Date;
    
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      // Try parsing as ISO string or other formats
      date = new Date(value);
      
      // If invalid date, try DD/MM/YYYY or MM/DD/YYYY format
      if (isNaN(date.getTime()) && value.includes('/')) {
        const parts = value.split('/');
        if (parts.length === 3) {
          // Try DD/MM/YYYY (European format)
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          
          if (day > 12) {
            // Definitely DD/MM/YYYY
            date = new Date(year, month - 1, day);
          } else {
            // Could be either format, try MM/DD/YYYY (US format)
            date = new Date(year, parts[0] as unknown as number - 1, parts[1] as unknown as number);
          }
        }
      }
    } else {
      logger.warn('⚠️ Invalid date type provided to transform', {
        value,
        type: typeof value
      });
      return null;
    }

    // Validate the date object
    if (isNaN(date.getTime())) {
      logger.warn('⚠️ Invalid date value provided to transform', {
        value,
        type: typeof value
      });
      return null;
    }

    // Format to YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;

  } catch (error: any) {
    logger.error('❌ Failed to transform date', {
      value,
      error: error.message
    });
    return null;
  }
}

/**
 * Zod Date Transform Schema
 * --------------------------
 * Reusable Zod schema that accepts various date formats and transforms to YYYY-MM-DD.
 * Use this in timesheet schemas instead of regex validation.
 * 
 * @example
 * const schema = z.object({
 *   startDate: dateTransformSchema.nullable().optional(),
 * });
 */
import { z } from 'zod';

export const dateTransformSchema = z.union([
  z.string(),
  z.date(),
  z.null(),
  z.undefined()
]).transform((val) => transformDateToYYYYMMDD(val as string | Date | null | undefined));
