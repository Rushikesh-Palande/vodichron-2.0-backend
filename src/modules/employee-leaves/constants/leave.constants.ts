/**
 * Leave Constants
 * ===============
 * Organization-wide leave policies and constants
 * 
 * Defines:
 * - Leave types
 * - Leave allocation per year
 * - Combined leave types
 */

/**
 * Combined Casual and Privileged Leave Type
 * ==========================================
 * In the organization, Casual Leave and Privileged Leave are tracked together
 * This constant represents the combined leave type name
 */
export const COMBINED_CASUAL_PRIVILEGE_LEAVE = 'Casual Leave_Privileged Leave';

/**
 * Organization Leave Allocation
 * =============================
 * Defines the standard leave allocation for all employees per year
 * 
 * Leave Types:
 * - Sick Leave: 8 days/year
 * - Casual Leave + Privileged Leave (combined): 14 days/year
 * - Personal Emergency: 2 days/year
 * 
 * Notes:
 * - Allocation is pro-rated for employees joining mid-year
 * - Only CL/PL can be carried forward (50% of unused balance)
 * - Special leaves (Maternity, Paternity, etc.) are tracked separately
 */
export const ORGANIZATION_LEAVE_ALLOCATION = [
  {
    leaveType: 'Sick Leave',
    allocatedLeaves: 8,
  },
  {
    leaveType: COMBINED_CASUAL_PRIVILEGE_LEAVE,
    allocatedLeaves: 14,
  },
  {
    leaveType: 'Personal Emergency',
    allocatedLeaves: 2,
  },
] as const;

/**
 * Leave Types Enum
 * ================
 * All possible leave types in the system
 */
export enum LeaveType {
  SICK_LEAVE = 'Sick Leave',
  CASUAL_LEAVE = 'Casual Leave',
  PRIVILEGED_LEAVE = 'Privileged Leave',
  PERSONAL_EMERGENCY = 'Personal Emergency',
  MATERNITY_LEAVE = 'Maternity Leave',
  PATERNITY_LEAVE = 'Paternity Leave',
  BEREAVEMENT_LEAVE = 'Bereavement Leave',
  MARRIAGE_LEAVE = 'Marriage Leave',
  LOSS_OF_PAY = 'Loss of Pay',
  WORK_FROM_HOME = 'Work From Home',
  COMPENSATORY_OFF = 'Compensatory Off',
}

/**
 * Leave Approval Status Enum
 * ==========================
 * Tracks the approval status of leave requests
 */
export enum LeaveApprovalStatus {
  REQUESTED = 'REQUESTED',   // Initial state when leave is applied
  PENDING = 'PENDING',       // Waiting for some approvers
  APPROVED = 'APPROVED',     // Approved by all required approvers
  REJECTED = 'REJECTED',     // Rejected by any approver
}

/**
 * Carry Forward Configuration
 * ===========================
 * Percentage of unused leave that can be carried forward to next year
 */
export const CARRY_FORWARD_PERCENTAGE = 0.5; // 50% of unused CL/PL
