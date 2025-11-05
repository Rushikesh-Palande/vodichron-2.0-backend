/**
 * Leave Allocation Store
 * ======================
 * Database operations for employee leave allocations
 * 
 * Responsibilities:
 * - Insert leave allocations (batch)
 * - Get leave allocations by employee and year
 * - Update leave allocations (allocated and carry forward)
 * - Update applied leaves count
 */

import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../../../../database';
import { logger, logDatabase, PerformanceTimer } from '../../../../utils/logger';
import {
  EmployeeLeaveAllocation,
  EmployeeLeaveAllocationInsert,
} from '../../types/employee-leave.types';

/**
 * Insert Employee Leave Allocation
 * ================================
 * Inserts leave allocations for an employee (batch insert)
 * Called when employee joins or at beginning of year
 * 
 * Process:
 * 1. Generate UUIDs for each allocation
 * 2. Build batch INSERT SQL
 * 3. Execute query with all allocations
 * 4. Return success
 * 
 * @param leaveAllocations - Array of leave allocations to insert
 * @returns True on success
 */
export async function insertEmployeeLeaveAllocation(
  leaveAllocations: EmployeeLeaveAllocationInsert[]
): Promise<boolean> {
  const timer = new PerformanceTimer('insertEmployeeLeaveAllocation');
  
  try {
    logger.info('📝 Inserting leave allocations', {
      count: leaveAllocations.length,
      operation: 'insertEmployeeLeaveAllocation'
    });

    // Build VALUES for batch insert
    const values = leaveAllocations.map(allocation => ({
      uuid: uuidv4(),
      year: allocation.year,
      employeeId: allocation.employeeId,
      leaveType: allocation.leaveType,
      leavesApplied: allocation.leavesApplied,
      leavesAllocated: allocation.leavesAllocated,
      leavesCarryForwarded: allocation.leavesCarryForwarded,
    }));

    // Build INSERT SQL
    const sql = `
      INSERT INTO employee_leave_allocation (
        uuid,
        year,
        employeeId,
        leaveType,
        leavesApplied,
        leavesAllocated,
        leavesCarryForwarded
      ) VALUES
      ${values.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}
    `;

    // Flatten values for query
    const flatValues = values.flatMap(v => [
      v.uuid,
      v.year,
      v.employeeId,
      v.leaveType,
      v.leavesApplied,
      v.leavesAllocated,
      v.leavesCarryForwarded,
    ]);

    // Execute batch INSERT
    await sequelize.query(sql, {
      replacements: flatValues,
      type: QueryTypes.INSERT,
    });

    const duration = timer.end();
    logDatabase('INSERT_LEAVE_ALLOCATION', `${leaveAllocations.length} records`, duration);

    logger.info('✅ Leave allocations inserted successfully', {
      count: leaveAllocations.length,
      duration: `${duration}ms`
    });

    return true;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('INSERT_LEAVE_ALLOCATION_ERROR', 'N/A', duration, error);

    logger.error('❌ Failed to insert leave allocations', {
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while inserting leave allocations: ${error.message}`);
  }
}

/**
 * Get Employee Leave Allocation By Employee ID
 * ============================================
 * Fetches all leave allocations for an employee for a specific year
 * Includes calculated leave balance
 * 
 * Process:
 * 1. Query employee_leave_allocation by employeeId and year
 * 2. Calculate leavesBalance (allocated + carryForward - applied)
 * 3. Return allocations array
 * 
 * @param employeeId - UUID of employee
 * @param year - Year (YYYY format)
 * @returns Array of leave allocations with balance
 */
export async function getEmployeeLeaveAllocationByEmployeeId(
  employeeId: string,
  year: string
): Promise<EmployeeLeaveAllocation[]> {
  const timer = new PerformanceTimer('getEmployeeLeaveAllocationByEmployeeId');
  
  try {
    logger.debug('🔍 Fetching employee leave allocations', {
      employeeId,
      year,
      operation: 'getEmployeeLeaveAllocationByEmployeeId'
    });

    // Query with calculated balance
    const sql = `
      SELECT 
        employee_leave_allocation.*,
        (
          employee_leave_allocation.leavesAllocated + 
          employee_leave_allocation.leavesCarryForwarded - 
          employee_leave_allocation.leavesApplied
        ) as leavesBalance
      FROM employee_leave_allocation
      WHERE employeeId = :employeeId AND year = :year
    `;

    const result = await sequelize.query<EmployeeLeaveAllocation>(sql, {
      replacements: { employeeId, year },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_LEAVE_ALLOCATION', employeeId, duration);

    logger.debug('✅ Leave allocations fetched', {
      employeeId,
      year,
      count: result.length,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_LEAVE_ALLOCATION_ERROR', employeeId, duration, error);

    logger.error('❌ Failed to fetch leave allocations', {
      employeeId,
      year,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching leave allocations: ${error.message}`);
  }
}

/**
 * Get Leave Allocation By Year And Employee ID And Leave Type
 * ===========================================================
 * Fetches specific leave allocation for employee, year, and leave type
 * Used when updating allocation after leave approval
 * 
 * Process:
 * 1. Query by employeeId, year, and leaveType
 * 2. Return allocation or empty array
 * 
 * @param employeeId - UUID of employee
 * @param year - Year (YYYY format)
 * @param leaveType - Type of leave
 * @returns Array with allocation (empty if not found)
 */
export async function getLeaveAllocationByYearAndEmployeeIdAndLeaveType(
  employeeId: string,
  year: string,
  leaveType: string
): Promise<EmployeeLeaveAllocation[]> {
  const timer = new PerformanceTimer('getLeaveAllocationByYearAndEmployeeIdAndLeaveType');
  
  try {
    logger.debug('🔍 Fetching specific leave allocation', {
      employeeId,
      year,
      leaveType,
      operation: 'getLeaveAllocationByYearAndEmployeeIdAndLeaveType'
    });

    const sql = `
      SELECT *
      FROM employee_leave_allocation
      WHERE employeeId = :employeeId 
        AND year = :year 
        AND leaveType = :leaveType
    `;

    const result = await sequelize.query<EmployeeLeaveAllocation>(sql, {
      replacements: { employeeId, year, leaveType },
      type: QueryTypes.SELECT,
      raw: true,
    });

    const duration = timer.end();
    logDatabase('GET_SPECIFIC_LEAVE_ALLOCATION', `${employeeId}-${leaveType}`, duration);

    logger.debug(result.length > 0 ? '✅ Allocation found' : '❌ Allocation not found', {
      employeeId,
      year,
      leaveType,
      duration: `${duration}ms`
    });

    return result;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('GET_SPECIFIC_LEAVE_ALLOCATION_ERROR', employeeId, duration, error);

    logger.error('❌ Failed to fetch specific leave allocation', {
      employeeId,
      year,
      leaveType,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while fetching leave allocation: ${error.message}`);
  }
}

/**
 * Update Leave Applied For Allocation
 * ===================================
 * Updates the leavesApplied count for an allocation
 * Called when leave is approved or rejected (after approval)
 * 
 * Process:
 * 1. Build UPDATE SQL for leavesApplied
 * 2. Execute query by UUID
 * 3. Return success
 * 
 * @param uuid - UUID of allocation record
 * @param leavesApplied - Updated leaves applied count
 * @returns True on success
 */
export async function updateLeaveAppliedForAllocation(
  uuid: string,
  leavesApplied: number
): Promise<boolean> {
  const timer = new PerformanceTimer('updateLeaveAppliedForAllocation');
  
  try {
    logger.info('📝 Updating leaves applied count', {
      uuid,
      leavesApplied,
      operation: 'updateLeaveAppliedForAllocation'
    });

    const sql = `
      UPDATE employee_leave_allocation
      SET leavesApplied = :leavesApplied
      WHERE uuid = :uuid
    `;

    await sequelize.query(sql, {
      replacements: { leavesApplied, uuid },
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_LEAVES_APPLIED', uuid, duration);

    logger.info('✅ Leaves applied count updated', {
      uuid,
      leavesApplied,
      duration: `${duration}ms`
    });

    return true;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_LEAVES_APPLIED_ERROR', uuid, duration, error);

    logger.error('❌ Failed to update leaves applied count', {
      uuid,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while updating leaves applied: ${error.message}`);
  }
}

/**
 * Update Leave Allocated For Employee
 * ===================================
 * Updates allocated leaves and carry forward for an allocation
 * Used by admins to manually adjust allocations
 * 
 * Process:
 * 1. Build UPDATE SQL for leavesAllocated and leavesCarryForwarded
 * 2. Execute query by UUID
 * 3. Return success
 * 
 * @param uuid - UUID of allocation record
 * @param leaveAllocated - Updated allocated leaves count
 * @param carryForward - Updated carry forward count
 * @returns True on success
 */
export async function updateLeaveAllocatedForEmployee(
  uuid: string,
  leaveAllocated: number,
  carryForward: number
): Promise<boolean> {
  const timer = new PerformanceTimer('updateLeaveAllocatedForEmployee');
  
  try {
    logger.info('📝 Updating leave allocation', {
      uuid,
      leaveAllocated,
      carryForward,
      operation: 'updateLeaveAllocatedForEmployee'
    });

    const sql = `
      UPDATE employee_leave_allocation
      SET 
        leavesAllocated = :leaveAllocated,
        leavesCarryForwarded = :carryForward
      WHERE uuid = :uuid
    `;

    await sequelize.query(sql, {
      replacements: { leaveAllocated, carryForward, uuid },
      type: QueryTypes.UPDATE,
    });

    const duration = timer.end();
    logDatabase('UPDATE_LEAVE_ALLOCATION', uuid, duration);

    logger.info('✅ Leave allocation updated', {
      uuid,
      duration: `${duration}ms`
    });

    return true;

  } catch (error: any) {
    const duration = timer.end();
    logDatabase('UPDATE_LEAVE_ALLOCATION_ERROR', uuid, duration, error);

    logger.error('❌ Failed to update leave allocation', {
      uuid,
      error: error.message,
      duration: `${duration}ms`
    });

    throw new Error(`Database error while updating leave allocation: ${error.message}`);
  }
}
