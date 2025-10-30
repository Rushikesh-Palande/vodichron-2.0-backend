/**
 * Check Employee Exist Service
 * =============================
 * Business logic for checking if employee email exists
 * Used for frontend form validation
 */

import { logger, PerformanceTimer } from '../../../../utils/logger';
import { checkEmployeeEmailExists } from '../../stores/crud/create.store';
import { CheckEmployeeExistInput } from '../../schemas/crud/check-employee-exist.schemas';

/**
 * Check Employee Exist Service
 * ============================
 * 
 * Checks if an employee with the given email already exists
 * 
 * @param input - Email and email type to check
 * @returns true if email exists, false otherwise
 */
export async function checkEmployeeExist(
  input: CheckEmployeeExistInput
): Promise<{ exists: boolean }> {
  const timer = new PerformanceTimer('checkEmployeeExist_service');
  
  try {
    logger.debug('🔍 Checking if employee email exists', {
      email: input.email,
      emailType: input.emailType,
      operation: 'checkEmployeeExist'
    });

    const employee = await checkEmployeeEmailExists(input.email, input.emailType);
    
    const exists = !!employee;
    
    const duration = timer.end();

    logger.debug(exists ? '✅ Employee email found' : '❌ Employee email not found', {
      email: input.email,
      emailType: input.emailType,
      exists,
      duration: `${duration}ms`
    });

    return { exists };

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to check employee email existence', {
      email: input.email,
      emailType: input.emailType,
      error: error.message,
      duration: `${duration}ms`
    });

    // On error, return true (assume exists) for safety
    // This prevents duplicate entries if the check fails
    return { exists: true };
  }
}
