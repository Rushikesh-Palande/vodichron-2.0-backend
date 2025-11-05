import { Router } from 'express';
import { logger } from '../../../utils/logger';
import { authenticateJWT } from '../../../middleware/auth.middleware';

// Leave Application Controllers
import { applyLeaveExpressController } from '../controllers/leave-application/apply-leave.controller';
import { getEmployeeLeavesExpressController } from '../controllers/leave-application/get-employee-leaves.controller';
import { getReporteeLeavesExpressController } from '../controllers/leave-application/get-reportee-leaves.controller';
import { updateLeaveStatusExpressController } from '../controllers/leave-application/update-leave-status.controller';

// Leave Balance & Allocation Controllers
import { getLeaveBalanceExpressController } from '../controllers/leave-balance-allocation/get-leave-balance.controller';
import { getLeaveAllocationExpressController } from '../controllers/leave-balance-allocation/get-leave-allocation.controller';
import { updateLeaveAllocationExpressController } from '../controllers/leave-balance-allocation/update-leave-allocation.controller';

/**
 * Employee Leaves Routes for Vodichron HRMS
 * =========================================
 * RESTful API routes for employee leave management operations.
 * 
 * Note: This is for Express REST API routes.
 * tRPC routes are defined separately in trpc/routers/
 * 
 * Based on old vodichron employeeLeaveRoutes.ts
 * 
 * Authorization Roles (defined in middleware):
 * - ORG_USERS: All organization users (employees + managers + HR + admins)
 * - ADMIN_USERS: HR, SuperUser, Admin
 * - EMP_MANAGERS: Managers, Directors
 * - CUSTOMER_USERS: Customers (for leave approval)
 */
const router = Router();

// Log route registration start
logger.info('🏖️ Initializing employee leaves routes...');

/**
 * GET /status
 * -----------
 * Returns employee leaves system status and enabled features
 * IMPORTANT: This route must be defined FIRST to avoid conflicts
 */
router.get('/status', (_req, res) => {
  logger.info('🏖️ Employee leaves system status requested');
  res.status(200).json({
    success: true,
    message: 'Employee leaves system status retrieved',
    data: {
      status: 'active',
      endpoints: {
        applyLeave: '/api/employee-leaves/apply',
        getEmployeeLeaves: '/api/employee-leaves/:employeeId',
        getReporteeLeaves: '/api/employee-leaves/reportee',
        updateLeaveStatus: '/api/employee-leaves/:leaveId/status',
        getLeaveBalance: '/api/employee-leaves/:employeeId/balance',
        getLeaveAllocation: '/api/employee-leaves/:employeeId/allocation',
        updateLeaveAllocation: '/api/employee-leaves/allocation',
        status: '/api/employee-leaves/status',
      },
      features: {
        leaveApplication: true,
        customerApproval: true, // ✅ Customer approver functionality
        secondaryApprover: true,
        halfDayLeaves: true,
        emailNotifications: true,
        leaveBalance: true,
        leaveAllocation: true,
        proRatedLeaves: true, // Based on joining date
        carryForward: true,
      },
      implemented: {
        applyLeave: true, // ✅ Available via both REST and tRPC
        getEmployeeLeaves: true, // ✅ Available via both REST and tRPC
        getReporteeLeaves: true, // ✅ Available via both REST and tRPC
        updateLeaveStatus: true, // ✅ Available via both REST and tRPC
        getLeaveBalance: true, // ✅ Available via both REST and tRPC
        getLeaveAllocation: true, // ✅ Available via both REST and tRPC
        updateLeaveAllocation: true, // ✅ Available via both REST and tRPC
      },
      timestamp: new Date().toISOString(),
    },
  });
});
logger.info('✅ Employee leaves status route registered: GET /employee-leaves/status');

/**
 * POST /apply
 * -----------
 * Apply for leave (create new leave application)
 * 
 * Authorization:
 * - ORG_USERS (all authenticated organization users)
 * - Employees can only apply for themselves
 * - Managers/HR can apply on behalf of employees
 * 
 * Request Body:
 * - employeeId: UUID of employee applying
 * - leaveType: Type of leave (CL, PL, SL, etc.)
 * - reason: Reason for leave
 * - leaveStartDate: Start date (YYYY-MM-DD)
 * - leaveEndDate: End date (YYYY-MM-DD)
 * - isHalfDay: Boolean (default: false)
 * - secondaryApproverId: Optional UUID of secondary approver
 * 
 * Business Logic:
 * - Validates dates and half-day constraints
 * - Checks for overlapping leaves
 * - Builds approver workflow (manager + secondary + customer)
 * - Sends email notifications to all approvers and employee
 * 
 * Old route: POST /employee/leave/apply
 */
router.post('/apply', authenticateJWT, applyLeaveExpressController);
logger.info('✅ Employee leaves route registered: POST /employee-leaves/apply');

/**
 * POST /:employeeId
 * -----------------
 * Get paginated leave records for a specific employee
 * 
 * Authorization:
 * - ORG_USERS (all authenticated organization users)
 * - Employees can only view their own leaves
 * - Managers/Directors/HR/SuperUser can view any employee's leaves
 * 
 * URL Parameters:
 * - employeeId: UUID of the employee
 * 
 * Request Body:
 * - pagination: { page: number, pageLimit: number }
 * - filters: Optional filters (status, type, date range, etc.)
 * 
 * Old route: POST /employee/leaves/:id
 */
router.post('/:employeeId', authenticateJWT, getEmployeeLeavesExpressController);
logger.info('✅ Employee leaves route registered: POST /employee-leaves/:employeeId');

/**
 * POST /reportee
 * --------------
 * Get paginated leave records for reportees (team members)
 * Used by managers and HR to view team leave requests
 * 
 * Authorization:
 * - ADMIN_USERS (HR, SuperUser, Admin)
 * - EMP_MANAGERS (Managers, Directors)
 * - Regular employees are forbidden
 * 
 * Request Body:
 * - pagination: { page: number, pageLimit: number }
 * - filters: Optional filters (status, type, employee, date range, etc.)
 * 
 * Business Logic:
 * - HR/SuperUser: Get ALL employee leaves (excluding self)
 * - Manager/Director: Get leaves where they are approvers
 * 
 * Old route: POST /employee/reportee/leaves/
 */
router.post('/reportee', authenticateJWT, getReporteeLeavesExpressController);
logger.info('✅ Employee leaves route registered: POST /employee-leaves/reportee');

/**
 * PATCH /:leaveId/status
 * ----------------------
 * Update leave approval status (approve/reject)
 * Used by managers, HR, and customers to approve or reject leave requests
 * 
 * Authorization:
 * - ADMIN_USERS (HR, SuperUser, Admin)
 * - EMP_MANAGERS (Managers, Directors)
 * - CUSTOMER_USERS (Customers with customerApprover flag)
 * - User must be in the approver list for the leave request
 * 
 * URL Parameters:
 * - leaveId: UUID of the leave request
 * 
 * Request Body:
 * - approvalStatus: 'APPROVED' | 'REJECTED' | 'PENDING'
 * - comment: Optional approver comment
 * 
 * Business Logic:
 * - Updates approver's status in workflow
 * - Determines final leave status (all approved / rejected / pending)
 * - Updates leave allocation if approved/rejected
 * - Sends email notification to employee
 * - HR/SuperUser can override and approve directly
 * - Any rejection immediately rejects the leave
 * 
 * Old route: PATCH /employee/leave/action/:leaveId
 */
router.patch('/:leaveId/status', authenticateJWT, updateLeaveStatusExpressController);
logger.info('✅ Employee leaves route registered: PATCH /employee-leaves/:leaveId/status');

/**
 * POST /:employeeId/balance
 * -------------------------
 * Get employee leave balance for a specific year
 * Shows available leave days, applied leaves, and balance by leave type
 * 
 * Authorization:
 * - ORG_USERS (all authenticated organization users)
 * - Employees can only view their own balance
 * - Managers/Directors/HR/SuperUser can view any employee's balance
 * 
 * URL Parameters:
 * - employeeId: UUID of the employee
 * 
 * Request Body:
 * - filters: { year?: string } (defaults to current year)
 * 
 * Business Logic:
 * - Fetches approved leaves for the year
 * - Calculates pro-rated leave balance based on joining date
 * - Transforms CL + PL (combined)
 * - Returns balance breakdown by leave type
 * 
 * Old route: POST /employee/leave/balance/:employeeId
 */
router.post('/:employeeId/balance', authenticateJWT, getLeaveBalanceExpressController);
logger.info('✅ Employee leaves route registered: POST /employee-leaves/:employeeId/balance');

/**
 * POST /:employeeId/allocation
 * ----------------------------
 * Get employee leave allocation records for a specific year
 * Shows allocated leaves, applied leaves, and balance by leave type
 * 
 * Authorization:
 * - ORG_USERS (all authenticated organization users)
 * - Employees can only view their own allocation
 * - Managers/Directors/HR/SuperUser can view any employee's allocation
 * 
 * URL Parameters:
 * - employeeId: UUID of the employee
 * 
 * Request Body:
 * - filters: { year?: string } (defaults to current year)
 * 
 * Business Logic:
 * - Fetches allocation records by employee and year
 * - Filters out zero-balance records (0 allocated, 0 applied)
 * - Transforms special leaves (shows 999 for unlimited balance)
 * 
 * Old route: POST /employee/leave/allocation/:employeeId
 */
router.post('/:employeeId/allocation', authenticateJWT, getLeaveAllocationExpressController);
logger.info('✅ Employee leaves route registered: POST /employee-leaves/:employeeId/allocation');

/**
 * POST /allocation
 * ----------------
 * Update employee leave allocation records (bulk operation)
 * Only HR and SuperUser can perform this operation
 * 
 * Authorization:
 * - ADMIN_USERS (HR, SuperUser only)
 * - All other roles are forbidden
 * 
 * Request Body:
 * - leaveAllocation: Array of allocation records to update
 *   - uuid: UUID of allocation record
 *   - leavesAllocated: Number of leaves allocated
 *   - leavesCarryForwarded: Number of leaves carried forward
 * 
 * Business Logic:
 * - Validates user is HR/SuperUser
 * - Batch updates all allocation records
 * - Returns count of updated records
 * 
 * Old route: POST /employee/update/leave-allocation/:employeeId
 */
router.post('/allocation', authenticateJWT, updateLeaveAllocationExpressController);
logger.info('✅ Employee leaves route registered: POST /employee-leaves/allocation');

// Log route registration complete
logger.info('✅ Employee leaves routes initialized successfully (7 routes)');

export default router;
