/**
 * Check Employee ID Exists Service
 * =================================
 * Business logic for checking if employee ID exists
 * Used for real-time form validation on frontend
 */

import { logger, PerformanceTimer } from '../../../../utils/logger';
import { checkEmployeeIdExists } from '../../stores/crud/create.store';
import { CheckEmployeeIdExistsInput } from '../../schemas/crud/check-employee-id-exists.schemas';

/**
 * Check Employee ID Exists Service
 * =================================
 * 
 * Checks if an employee with the given ID already exists
 * 
 * @param input - Employee ID to check
 * @returns true if employee ID exists, false otherwise
 */
export async function checkEmployeeIdExistsService(
  input: CheckEmployeeIdExistsInput
): Promise<{ exists: boolean }> {
  const timer = new PerformanceTimer('checkEmployeeIdExists_service');
  
  try {
    logger.debug('\ud83d\udd0d Checking if employee ID exists', {
      employeeId: input.employeeId,
      operation: 'checkEmployeeIdExists'
    });

    const employee = await checkEmployeeIdExists(input.employeeId);
    
    const exists = !!employee;
    
    const duration = timer.end();

    logger.debug(exists ? '\u2705 Employee ID found' : '\u274c Employee ID not found', {
      employeeId: input.employeeId,
      exists,
      duration: `${duration}ms`
    });

    return { exists };

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('\u274c Failed to check employee ID existence', {
      employeeId: input.employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    // On error, return true (assume exists) for safety
    // This prevents duplicate entries if the check fails
    return { exists: true };
  }
}
