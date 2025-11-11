/**
 * Generate Task ID Helper
 * ========================
 * Generates sequential task IDs for employee timesheets
 * Format: TASK001, TASK002, TASK003, etc.
 * 
 * The task ID tracks the total number of tasks an employee has submitted
 * across all their daily and weekly timesheets.
 */

import { logger } from '../../../utils/logger';
import { getEmployeeTaskCount } from '../stores/get-employee-task-count.store';

/**
 * Generate Task ID for Employee
 * ------------------------------
 * Generates the next sequential task ID for an employee based on their task count
 * 
 * @param employeeId - UUID of the employee
 * @returns Task ID in format TASK001, TASK002, etc.
 * 
 * @example
 * // If employee has 19 tasks already
 * await generateTaskId('employee-uuid') // Returns: 'TASK020'
 * 
 * @example
 * // First task for employee
 * await generateTaskId('employee-uuid') // Returns: 'TASK001'
 */
export async function generateTaskId(employeeId: string): Promise<string> {
  try {
    logger.debug('🔢 Generating task ID for employee', {
      employeeId,
      operation: 'generateTaskId'
    });

    // Get the current task count for this employee
    const taskCount = await getEmployeeTaskCount(employeeId);
    
    // Next task number (count + 1)
    const nextTaskNumber = taskCount + 1;
    
    // Format as TASK001, TASK002, etc. (pad with leading zeros to 3 digits)
    const taskId = `TASK${String(nextTaskNumber).padStart(3, '0')}`;
    
    logger.debug('✅ Task ID generated successfully', {
      employeeId,
      taskCount,
      nextTaskNumber,
      taskId
    });

    return taskId;

  } catch (error: any) {
    logger.error('❌ Failed to generate task ID', {
      employeeId,
      error: error.message,
      stack: error.stack
    });
    
    throw new Error(`Failed to generate task ID: ${error.message}`);
  }
}

/**
 * Format Task Number to Task ID
 * ------------------------------
 * Utility function to format a task number into task ID format
 * 
 * @param taskNumber - The task number (1, 2, 3, etc.)
 * @returns Formatted task ID (TASK001, TASK002, etc.)
 * 
 * @example
 * formatTaskNumber(1)   // Returns: 'TASK001'
 * formatTaskNumber(20)  // Returns: 'TASK020'
 * formatTaskNumber(150) // Returns: 'TASK150'
 */
export function formatTaskNumber(taskNumber: number): string {
  return `TASK${String(taskNumber).padStart(3, '0')}`;
}
