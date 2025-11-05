/**
 * Leave Calculation Service
 * =========================
 * Business logic for leave calculations
 * 
 * Responsibilities:
 * - Calculate employee leave balance (with pro-rating)
 * - Calculate employee leave allocation (pro-rated for mid-year joiners)
 * - Transform applied leaves (combine Casual + Privilege)
 * - Upsert leave allocations after approval/rejection
 * - Allocate leaves for new employees
 * - Process carry forward logic
 */

import moment from 'moment';
import { logger, PerformanceTimer } from '../../../utils/logger';
import {
  AppliedLeaves,
  AllocatedLeaves,
  LeaveBalance,
  LeaveCarryForwarded,
  EmployeeLeave,
  EmployeeLeaveAllocationInsert,
} from '../types/employee-leave.types';
import {
  ORGANIZATION_LEAVE_ALLOCATION,
  COMBINED_CASUAL_PRIVILEGE_LEAVE,
  CARRY_FORWARD_PERCENTAGE,
  LeaveApprovalStatus,
} from '../constants/leave.constants';
import {
  getLeaveAllocationByYearAndEmployeeIdAndLeaveType,
  updateLeaveAppliedForAllocation,
  insertEmployeeLeaveAllocation,
  getEmployeeLeaveAllocationByEmployeeId,
} from '../stores/leave-allocation/leave-allocation.store';
import { calculateLeaveDays } from '../helpers/leave-calculations.helper';

/**
 * Applied Leaves Transformer
 * ==========================
 * Combines Casual Leave and Privileged Leave into single entry
 * 
 * Logic from old vodichron:
 * - If employee has Casual or Privilege leaves, combine them
 * - Remove individual Casual/Privilege entries
 * - Add combined "Casual Leave_Privileged Leave" entry
 * 
 * @param appliedLeaves - Array of applied leaves by type
 * @returns Transformed array with combined CL/PL
 */
export function appliedLeavesTransformer(appliedLeaves: AppliedLeaves[]): AppliedLeaves[] {
  const timer = new PerformanceTimer('appliedLeavesTransformer');
  
  try {
    logger.debug('🔄 Transforming applied leaves (combining CL/PL)', {
      operation: 'appliedLeavesTransformer',
      inputCount: appliedLeaves.length
    });

    // Calculate combined Casual + Privilege leave count
    let casualPrivilegedLeaveCount = 0;
    for (const leave of appliedLeaves) {
      const { leaveType, leavesApplied } = leave;
      if (leaveType === 'Casual Leave' || leaveType === 'Privileged Leave') {
        casualPrivilegedLeaveCount += leavesApplied;
      }
    }

    // Add combined entry if CL/PL exists
    if (casualPrivilegedLeaveCount > 0) {
      appliedLeaves.push({
        leaveType: COMBINED_CASUAL_PRIVILEGE_LEAVE,
        leavesApplied: casualPrivilegedLeaveCount,
      });
    }

    // Filter out individual CL/PL entries
    const transformedLeaves = appliedLeaves.filter(
      (leave) => leave.leaveType !== 'Casual Leave' && leave.leaveType !== 'Privileged Leave'
    );

    const duration = timer.end();
    
    logger.debug('✅ Applied leaves transformed', {
      outputCount: transformedLeaves.length,
      duration: `${duration}ms`
    });

    return transformedLeaves;

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to transform applied leaves', {
      error: error.message,
      duration: `${duration}ms`
    });

    throw error;
  }
}

/**
 * Calculate Employee Leave Balance
 * ================================
 * Calculates available leave balance based on:
 * - Employee joining date (pro-rating for mid-year joiners)
 * - Applied leaves to date
 * - Organization leave policy
 * 
 * Pro-rating logic from old vodichron:
 * - If joined before current year: Full allocation
 * - If joined mid-year: Pro-rated based on joining month and day
 *   - If joined on/after 15th: That month is lapsed
 *   - If joined before 15th: That month counts
 * 
 * @param employeeAppliedLeaves - Applied leaves grouped by type
 * @param employeeJoiningDate - Date of joining (YYYY-MM-DD)
 * @param calculationYear - Year for calculation
 * @returns Array of leave balances by type
 */
export function calculateEmployeeLeaveBalance(
  employeeAppliedLeaves: AppliedLeaves[],
  employeeJoiningDate: string,
  calculationYear: string
): LeaveBalance[] {
  const timer = new PerformanceTimer('calculateEmployeeLeaveBalance');
  
  try {
    logger.debug('🧮 Calculating employee leave balance', {
      employeeJoiningDate,
      calculationYear,
      operation: 'calculateEmployeeLeaveBalance'
    });

    const empJoiningDateArr = employeeJoiningDate.split('-');
    const employeeJoiningYear = parseInt(empJoiningDateArr[0], 10);
    const currentYear = parseInt(calculationYear, 10);
    const employeeLeaveBalance: LeaveBalance[] = [];

    if (employeeJoiningYear < currentYear) {
      // CASE 1: Full year allocation (joined before current year)
      logger.debug('📅 Full year allocation (joined before current year)');
      
      for (const leaves of employeeAppliedLeaves) {
        const result = ORGANIZATION_LEAVE_ALLOCATION.find((obj) => obj.leaveType === leaves.leaveType);
        if (result) {
          const { allocatedLeaves } = result;
          const balance = allocatedLeaves - leaves.leavesApplied;
          employeeLeaveBalance.push({
            leaveType: leaves.leaveType,
            leaveBalance: Math.round(balance),
          });
        } else {
          // Special leave types (not in org policy)
          logger.debug(`⚠️ Leave type not in org allocation: ${leaves.leaveType}`);
          employeeLeaveBalance.push({
            leaveType: leaves.leaveType,
            leaveBalance: 999, // Unlimited - handled on frontend
          });
        }
      }
    } else {
      // CASE 2: Pro-rated allocation (joined mid-year)
      logger.debug('📅 Pro-rated allocation (joined mid-year)');
      
      const joiningMonth = parseInt(empJoiningDateArr[1], 10);
      const joiningDay = parseInt(empJoiningDateArr[2], 10);

      for (const leaves of employeeAppliedLeaves) {
        const result = ORGANIZATION_LEAVE_ALLOCATION.find((obj) => obj.leaveType === leaves.leaveType);
        if (result) {
          const { allocatedLeaves } = result;
          let lapsedLeaves = 0;

          // Pro-rating logic
          if (joiningDay >= 15) {
            // Joined on/after 15th: Current month is lapsed
            lapsedLeaves = (allocatedLeaves / 12) * joiningMonth;
          } else {
            // Joined before 15th: Current month counts
            lapsedLeaves = Math.floor((allocatedLeaves / 12) * (joiningMonth - 1));
          }

          const actualAllocated = allocatedLeaves - lapsedLeaves;
          const balance = Math.round(actualAllocated - leaves.leavesApplied);
          
          employeeLeaveBalance.push({
            leaveType: leaves.leaveType,
            leaveBalance: balance,
          });
        } else {
          // Special leave types
          logger.debug(`⚠️ Leave type not in org allocation: ${leaves.leaveType}`);
          employeeLeaveBalance.push({
            leaveType: leaves.leaveType,
            leaveBalance: 999,
          });
        }
      }
    }

    // Add leave types that employee hasn't applied yet (full balance)
    for (const orgLeaves of ORGANIZATION_LEAVE_ALLOCATION) {
      const result = employeeLeaveBalance.find((obj) => obj.leaveType === orgLeaves.leaveType);
      if (!result) {
        employeeLeaveBalance.push({
          leaveType: orgLeaves.leaveType,
          leaveBalance: orgLeaves.allocatedLeaves,
        });
      }
    }

    const duration = timer.end();
    
    logger.debug('✅ Leave balance calculated', {
      leaveTypes: employeeLeaveBalance.length,
      duration: `${duration}ms`
    });

    return employeeLeaveBalance;

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to calculate leave balance', {
      error: error.message,
      duration: `${duration}ms`
    });

    throw error;
  }
}

/**
 * Calculate Employee Leave Allocation
 * ===================================
 * Calculates pro-rated leave allocation for employee based on joining date
 * 
 * Same pro-rating logic as balance calculation:
 * - Full year if joined before calculation year
 * - Pro-rated if joined mid-year
 * 
 * @param employeeJoiningDate - Date of joining (YYYY-MM-DD)
 * @param calculationYear - Year for calculation
 * @returns Array of allocated leaves by type
 */
export function calculateEmployeeLeaveAllocation(
  employeeJoiningDate: string,
  calculationYear: string
): AllocatedLeaves[] {
  const timer = new PerformanceTimer('calculateEmployeeLeaveAllocation');
  
  try {
    logger.debug('🧮 Calculating employee leave allocation', {
      employeeJoiningDate,
      calculationYear,
      operation: 'calculateEmployeeLeaveAllocation'
    });

    const empJoiningDateArr = employeeJoiningDate.split('-');
    const employeeJoiningYear = parseInt(empJoiningDateArr[0], 10);
    const currentYear = parseInt(calculationYear, 10);
    const employeeAllocatedLeaves: AllocatedLeaves[] = [];

    if (employeeJoiningYear < currentYear) {
      // Full year allocation
      for (const leaves of ORGANIZATION_LEAVE_ALLOCATION) {
        const { allocatedLeaves } = leaves;
        employeeAllocatedLeaves.push({
          leaveType: leaves.leaveType,
          allocatedLeaves,
        });
      }
    } else {
      // Pro-rated allocation
      const joiningMonth = parseInt(empJoiningDateArr[1], 10);
      const joiningDay = parseInt(empJoiningDateArr[2], 10);

      for (const leaves of ORGANIZATION_LEAVE_ALLOCATION) {
        const { allocatedLeaves } = leaves;
        let lapsedLeaves = 0;

        if (joiningDay >= 15) {
          lapsedLeaves = Math.round((allocatedLeaves / 12) * joiningMonth);
        } else {
          lapsedLeaves = Math.round((allocatedLeaves / 12) * (joiningMonth - 1));
        }

        const actualAllocated = allocatedLeaves - lapsedLeaves;
        employeeAllocatedLeaves.push({
          leaveType: leaves.leaveType,
          allocatedLeaves: actualAllocated,
        });
      }
    }

    const duration = timer.end();
    
    logger.debug('✅ Leave allocation calculated', {
      leaveTypes: employeeAllocatedLeaves.length,
      duration: `${duration}ms`
    });

    return employeeAllocatedLeaves;

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to calculate leave allocation', {
      error: error.message,
      duration: `${duration}ms`
    });

    throw error;
  }
}

/**
 * Upsert Leave Allocations
 * ========================
 * Updates leave allocation after leave approval/rejection
 * 
 * Logic from old vodichron:
 * - When leave is APPROVED: Increment leavesApplied
 * - When leave is REJECTED (after being APPROVED): Decrement leavesApplied
 * - Combines Casual/Privilege into single allocation
 * - Creates new allocation if doesn't exist (for special leaves)
 * 
 * @param leaveData - Leave record
 * @param status - New approval status
 */
export async function upsertLeaveAllocations(
  leaveData: EmployeeLeave,
  status: LeaveApprovalStatus
): Promise<void> {
  const timer = new PerformanceTimer('upsertLeaveAllocations');
  
  try {
    logger.info('📝 Upserting leave allocations', {
      leaveId: leaveData.uuid,
      leaveType: leaveData.leaveType,
      status,
      operation: 'upsertLeaveAllocations'
    });

    const leaveYear = moment(leaveData.createdAt).format('YYYY');
    let { leaveType } = leaveData;

    // Combine Casual/Privilege into single type
    if (leaveData.leaveType === 'Casual Leave' || leaveData.leaveType === 'Privileged Leave') {
      leaveType = COMBINED_CASUAL_PRIVILEGE_LEAVE;
    }

    // Get existing allocation
    const leaveAllocation = await getLeaveAllocationByYearAndEmployeeIdAndLeaveType(
      leaveData.employeeId,
      leaveYear,
      leaveType
    );

    // Calculate leave days
    let leaveAppliedDays = calculateLeaveDays(leaveData.leaveStartDate, leaveData.leaveEndDate);
    if (leaveData.isHalfDay) {
      leaveAppliedDays = 0.5;
    }

    if (leaveAllocation.length > 0) {
      // UPDATE existing allocation
      const allocatedLeave = leaveAllocation[0];

      if (status === LeaveApprovalStatus.APPROVED && leaveData.leaveApprovalStatus !== LeaveApprovalStatus.APPROVED) {
        // Leave was just approved - increment applied count
        const totalApplied = parseFloat(`${allocatedLeave.leavesApplied}`) + parseFloat(`${leaveAppliedDays}`);
        await updateLeaveAppliedForAllocation(allocatedLeave.uuid, totalApplied);
        
        logger.info('✅ Leave allocation updated (approved)', {
          allocationId: allocatedLeave.uuid,
          totalApplied
        });
        
      } else if (status === LeaveApprovalStatus.REJECTED && leaveData.leaveApprovalStatus === LeaveApprovalStatus.APPROVED) {
        // Leave was approved but now rejected - decrement applied count
        const totalApplied = parseFloat(`${allocatedLeave.leavesApplied}`) - parseFloat(`${leaveAppliedDays}`);
        await updateLeaveAppliedForAllocation(allocatedLeave.uuid, totalApplied);
        
        logger.info('✅ Leave allocation updated (rejected after approval)', {
          allocationId: allocatedLeave.uuid,
          totalApplied
        });
      }
    } else if (status === LeaveApprovalStatus.APPROVED && leaveData.leaveApprovalStatus !== LeaveApprovalStatus.APPROVED) {
      // CREATE new allocation for "non-allocated" leave types (special leaves)
      await insertEmployeeLeaveAllocation([
        {
          employeeId: leaveData.employeeId,
          leaveType: leaveData.leaveType,
          year: leaveYear,
          leavesAllocated: 0,
          leavesCarryForwarded: 0,
          leavesApplied: leaveAppliedDays,
        },
      ]);
      
      logger.info('✅ New allocation created for special leave', {
        employeeId: leaveData.employeeId,
        leaveType: leaveData.leaveType
      });
    }

    const duration = timer.end();
    
    logger.info('✅ Leave allocations upserted successfully', {
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to upsert leave allocations', {
      error: error.message,
      duration: `${duration}ms`
    });

    throw error;
  }
}

/**
 * Allocate Employee Leaves
 * ========================
 * Allocates leaves for an employee for a specific year
 * Called when employee joins or at beginning of year
 * 
 * @param employeeId - UUID of employee
 * @param employeeJoiningDate - Date of joining (YYYY-MM-DD)
 * @param year - Year for allocation
 * @param leavesToCarryForward - Array of carry forward leaves (optional)
 */
export async function allocateEmployeeLeaves(
  employeeId: string,
  employeeJoiningDate: string,
  year: string,
  leavesToCarryForward: LeaveCarryForwarded[] = []
): Promise<void> {
  const timer = new PerformanceTimer('allocateEmployeeLeaves');
  
  try {
    logger.info('📅 Allocating leaves for employee', {
      employeeId,
      year,
      operation: 'allocateEmployeeLeaves'
    });

    // Calculate pro-rated allocation
    const leaveAllocation = calculateEmployeeLeaveAllocation(employeeJoiningDate, year);
    const allocation: EmployeeLeaveAllocationInsert[] = [];

    // Build allocation records with carry forward
    for (const leavesAllocated of leaveAllocation) {
      const carryForwardObject = leavesToCarryForward.find(
        (carryForwardLeave) => carryForwardLeave.leaveType === leavesAllocated.leaveType
      );
      
      const carryForward = carryForwardObject?.leavesCarryForwarded || 0;

      allocation.push({
        employeeId,
        leaveType: leavesAllocated.leaveType,
        year,
        leavesAllocated: leavesAllocated.allocatedLeaves,
        leavesCarryForwarded: carryForward,
        leavesApplied: 0,
      });
    }

    // Insert allocations
    if (allocation.length > 0) {
      await insertEmployeeLeaveAllocation(allocation);
    }

    const duration = timer.end();
    
    logger.info('✅ Leaves allocated successfully', {
      employeeId,
      year,
      count: allocation.length,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to allocate leaves', {
      employeeId,
      year,
      error: error.message,
      duration: `${duration}ms`
    });

    throw error;
  }
}

/**
 * Leave Allocation Process For Employee
 * =====================================
 * Process leave allocation for employee including carry forward from previous year
 * 
 * Logic from old vodichron:
 * - Get previous year's CL/PL balance
 * - Calculate carry forward (50% of unused balance if > 1)
 * - Allocate leaves for new year with carry forward
 * 
 * @param employeeId - UUID of employee
 * @param dateOfJoining - Date of joining (YYYY-MM-DD)
 * @param year - Year for allocation
 */
export async function leaveAllocationProcessForEmployee(
  employeeId: string,
  dateOfJoining: string,
  year: string
): Promise<void> {
  const timer = new PerformanceTimer('leaveAllocationProcessForEmployee');
  
  try {
    logger.info('🔄 Processing leave allocation with carry forward', {
      employeeId,
      year,
      operation: 'leaveAllocationProcessForEmployee'
    });

    let carryForward = 0;
    const previousYear = (new Date(year).getFullYear() - 1).toString();

    // Get previous year's allocations
    const employeeLeaves = await getEmployeeLeaveAllocationByEmployeeId(employeeId, previousYear);

    if (employeeLeaves.length > 0) {
      // Find CL/PL combined leave
      const filteredAppliedLeaves = employeeLeaves.filter(
        (leave) => leave.leaveType === COMBINED_CASUAL_PRIVILEGE_LEAVE
      );

      if (filteredAppliedLeaves.length > 0) {
        const combinedCLPLLeave = filteredAppliedLeaves[0];
        const { leavesBalance } = combinedCLPLLeave;

        // Apply 50% carry forward rule
        if (leavesBalance > 1) {
          carryForward = leavesBalance * CARRY_FORWARD_PERCENTAGE;
          
          logger.info('📊 Carry forward calculated', {
            previousBalance: leavesBalance,
            carryForward
          });
        }
      }
    }

    // Allocate leaves with carry forward
    await allocateEmployeeLeaves(employeeId, dateOfJoining, year, [
      {
        leaveType: COMBINED_CASUAL_PRIVILEGE_LEAVE,
        leavesCarryForwarded: carryForward,
      },
    ]);

    const duration = timer.end();
    
    logger.info('✅ Leave allocation process completed', {
      employeeId,
      year,
      carryForward,
      duration: `${duration}ms`
    });

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to process leave allocation', {
      employeeId,
      year,
      error: error.message,
      duration: `${duration}ms`
    });

    throw error;
  }
}
