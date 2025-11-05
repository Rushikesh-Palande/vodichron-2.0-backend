/**
 * Get Leave Balance Service
 * ==========================
 * Business logic for fetching employee leave balance
 * 
 * Responsibilities:
 * - Authorization checks
 * - Fetch approved leaves for year
 * - Calculate leave balance with pro-rating
 * - Return balance breakdown by leave type
 */

import { TRPCError } from '@trpc/server';
import moment from 'moment';
import { logger, logSecurity, PerformanceTimer } from '../../../utils/logger';
import { GetLeaveBalanceInput } from '../schemas/leave-balance-allocation.schemas';
import { ApplicationUserRole, EmployeeLeaveBalance } from '../types/employee-leave.types';
import { LeaveApprovalStatus, ORGANIZATION_LEAVE_ALLOCATION } from '../constants/leave.constants';
import { getEmployeeLeavesByStatusGroupByLeaveType } from '../stores/leave-application/get-leaves.store';
import { appliedLeavesTransformer, calculateEmployeeLeaveBalance } from './leave-calculation.service';
import { getEmployeeByUuid } from '../../employee/stores/crud/get-employee-by-uuid.store';

/**
 * User Context Interface
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Get Leave Balance Service
 * ==========================
 * 
 * Calculates employee leave balance for a specific year
 * 
 * Business Logic:
 * 1. Authorization check
 * 2. Fetch approved leaves grouped by type
 * 3. Transform CL+PL leaves (combined)
 * 4. Fetch employee details for pro-rating
 * 5. Calculate balance based on joining date
 * 6. Return balance with applied leaves
 * 
 * @param input - Employee ID and year
 * @param user - Authenticated user context
 * @returns Leave balance breakdown
 */
export async function getLeaveBalance(
  input: GetLeaveBalanceInput,
  user: UserContext
): Promise<EmployeeLeaveBalance> {
  const timer = new PerformanceTimer('getLeaveBalance_service');
  
  try {
    const year = input.filters?.year || new Date().getFullYear().toString();

    logger.info('🔍 Fetching leave balance', {
      employeeId: input.employeeId,
      year,
      requestedBy: user.uuid,
      operation: 'getLeaveBalance'
    });

    // Authorization Check
    if (user.role === ApplicationUserRole.employee && user.uuid !== input.employeeId) {
      logger.warn('🚫 Access denied - Employee trying to view another employee\'s balance', {
        userId: user.uuid,
        targetEmployeeId: input.employeeId
      });

      logSecurity('GET_LEAVE_BALANCE_ACCESS_DENIED', 'high', {
        userRole: user.role,
        reason: 'Employee trying to view another employee\'s balance'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied. You can only view your own leave balance.'
      });
    }

    // Fetch approved leaves grouped by type
    const employeeLeaves = await getEmployeeLeavesByStatusGroupByLeaveType(
      input.employeeId,
      LeaveApprovalStatus.APPROVED,
      year
    );

    // Transform leaves (combines CL + PL)
    const filteredLeaves = appliedLeavesTransformer(employeeLeaves);

    // Fetch employee details for pro-rating calculation
    const employeeDetails = await getEmployeeByUuid(input.employeeId);

    if (!employeeDetails) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Employee not found.'
      });
    }

    // Calculate leave balance with pro-rating
    const leaveBalance = calculateEmployeeLeaveBalance(
      filteredLeaves,
      moment(employeeDetails.dateOfJoining).format('YYYY-MM-DD'),
      year
    );

    // Build result with applied leaves
    const result = leaveBalance.map(balance => {
      const appliedLeave = filteredLeaves.find(
        leave => leave.leaveType === balance.leaveType
      ) || { leavesApplied: 0 };

      return {
        leaveType: balance.leaveType,
        leaveBalance: balance.leaveBalance,
        leavesApplied: appliedLeave.leavesApplied,
      };
    });

    const duration = timer.end();
    
    logger.info('✅ Leave balance calculated successfully', {
      employeeId: input.employeeId,
      year,
      balanceCount: result.length,
      duration: `${duration}ms`
    });

    return {
      employeeId: input.employeeId,
      year,
      leaveBalance: result,
      organizationAllotedLeaves: [...ORGANIZATION_LEAVE_ALLOCATION],
    };

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to fetch leave balance', {
      employeeId: input.employeeId,
      error: error.message,
      duration: `${duration}ms`
    });

    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to fetch leave balance: ${error.message}`
    });
  }
}
