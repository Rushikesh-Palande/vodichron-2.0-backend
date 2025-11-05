import { router } from '../../../trpc/trpc';
import { applyLeaveProcedure } from './routers/leave-application/apply-leave.router';
import { getEmployeeLeavesProcedure } from './routers/leave-application/get-employee-leaves.router';
import { getReporteeLeavesProcedure } from './routers/leave-application/get-reportee-leaves.router';
import { updateLeaveStatusProcedure } from './routers/leave-application/update-leave-status.router';
import { getLeaveBalanceProcedure } from './routers/leave-balance-allocation/get-leave-balance.router';
import { getLeaveAllocationProcedure } from './routers/leave-balance-allocation/get-leave-allocation.router';
import { updateLeaveAllocationProcedure } from './routers/leave-balance-allocation/update-leave-allocation.router';

/**
 * Vodichron HRMS Employee Leaves tRPC Router
 * ===========================================
 * Handles employee leave management operations for the Vodichron HRMS system using tRPC.
 * 
 * Features:
 * - Type-safe API with automatic validation
 * - Role-based access control (RBAC)
 * - Comprehensive logging and audit trail
 * - Performance monitoring
 * - Customer approver workflow
 * - Pro-rated leave calculations
 * 
 * Procedures:
 * 
 * Leave Application:
 * - applyLeave: Submit new leave application
 * - getEmployeeLeaves: Fetch employee's own leave records (paginated)
 * - getReporteeLeaves: Fetch team leave records (managers/HR)
 * - updateLeaveStatus: Approve/reject leave requests
 * 
 * Leave Balance & Allocation:
 * - getLeaveBalance: Fetch employee leave balance for a year
 * - getLeaveAllocation: Fetch employee leave allocation records
 * - updateLeaveAllocation: Update leave allocations (HR only, bulk operation)
 * 
 * Access Control:
 * - ORG_USERS: All authenticated organization users (employees + managers + HR + admins)
 * - ADMIN_USERS: HR, SuperUser, Admin
 * - EMP_MANAGERS: Managers, Directors
 * - CUSTOMER_USERS: Customers (for leave approval)
 */
export const employeeLeavesRouter = router({
  // Leave Application Procedures
  applyLeave: applyLeaveProcedure,
  getEmployeeLeaves: getEmployeeLeavesProcedure,
  getReporteeLeaves: getReporteeLeavesProcedure,
  updateLeaveStatus: updateLeaveStatusProcedure,

  // Leave Balance & Allocation Procedures
  getLeaveBalance: getLeaveBalanceProcedure,
  getLeaveAllocation: getLeaveAllocationProcedure,
  updateLeaveAllocation: updateLeaveAllocationProcedure,
});
