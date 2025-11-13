import { Router } from 'express';
import { logger } from '../../../utils/logger';
import { authenticateJWT } from '../../../middleware/auth.middleware';

// Daily Timesheet Controllers
import { createDailyTimesheetExpressController } from '../controllers/daily/create-daily-timesheet.controller';
import { listDailyTimesheetsExpressController } from '../controllers/daily/list-daily-timesheets.controller';
import { listReporteeDailyTimesheetsExpressController } from '../controllers/daily/list-reportee-daily-timesheets.controller';
import { updateDailyTimesheetApprovalExpressController } from '../controllers/daily/update-daily-timesheet-approval.controller';

// Weekly Timesheet Controllers
import { createWeeklyTimesheetExpressController } from '../controllers/weekly/create-weekly-timesheet.controller';
import { listWeeklyTimesheetsExpressController } from '../controllers/weekly/list-weekly-timesheets.controller';
import { getWeeklyTimesheetDetailExpressController } from '../controllers/weekly/get-weekly-timesheet-detail.controller';
import { listReporteeWeeklyTimesheetsExpressController } from '../controllers/weekly/list-reportee-weekly-timesheets.controller';
import { approveWeeklyTimesheetExpressController } from '../controllers/weekly/approve-weekly-timesheet.controller';
import { downloadWeeklyTimesheetTemplateController } from '../controllers/weekly/download-template.controller';

/**
 * Timesheet Routes for Vodichron HRMS
 * ====================================
 * RESTful API routes for timesheet management operations.
 * 
 * Note: This is for Express REST API routes.
 * tRPC routes are defined separately in trpc/routers/
 * 
 * Based on old vodichron:
 * - employeeTimesheetController.ts (daily timesheets)
 * - employeeWeeklyTimesheetController.ts (weekly timesheets)
 * 
 * Authorization Roles (defined in middleware):
 * - ORG_USERS: All organization users (employees + managers + HR + admins)
 * - ADMIN_USERS: HR, SuperUser, Admin
 * - EMP_MANAGERS: Managers, Directors
 * - CUSTOMER_USERS: Customers (for timesheet approval)
 */
const router = Router();

logger.info('⏱️ Initializing timesheet routes...');

/**
 * @route   GET /api/timesheet/status
 * @desc    Get timesheet system status and enabled features
 * @access  Public
 * @returns {object} System status with available endpoints and features
 * 
 * @example
 * GET /api/timesheet/status
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Timesheet system status retrieved",
 *   "data": {
 *     "status": "active",
 *     "endpoints": {...},
 *     "features": {...}
 *   }
 * }
 */
router.get('/status', (_req, res) => {
  logger.info('⏱️ Timesheet system status requested');
  res.status(200).json({
    success: true,
    message: 'Timesheet system status retrieved',
    data: {
      status: 'active',
      endpoints: {
        createDailyTimesheet: '/api/timesheet/daily/create',
        listDailyTimesheets: '/api/timesheet/daily/:employeeId',
        listReporteeDailyTimesheets: '/api/timesheet/daily/reportee',
        updateDailyTimesheetApproval: '/api/timesheet/daily/:timesheetUuid/approval',
        createWeeklyTimesheet: '/api/timesheet/weekly/create',
        listWeeklyTimesheets: '/api/timesheet/weekly/:employeeId',
        getWeeklyTimesheetDetail: '/api/timesheet/weekly/:timesheetId/detail',
        listReporteeWeeklyTimesheets: '/api/timesheet/weekly/reportee',
        approveWeeklyTimesheet: '/api/timesheet/weekly/:timesheetId/approve',
        downloadWeeklyTemplate: '/api/timesheet/weekly/template (or /template/:employeeId)',
        status: '/api/timesheet/status',
      },
      features: {
        dailyTimesheet: true,
        weeklyTimesheet: true,
        taskTracking: true,
        taskLocking: true,
        emailNotifications: true,
        approvalWorkflow: true,
        customerApproval: true,
      },
      timestamp: new Date().toISOString(),
    },
  });
});
logger.info('✅ Timesheet status route registered: GET /timesheet/status');

// ============================================================================
// DAILY TIMESHEET ROUTES
// ============================================================================

/**
 * @route   POST /api/timesheet/daily/create
 * @desc    Create a new daily timesheet
 * @access  Protected (JWT required)
 * @auth    ORG_USERS - Employees can only create their own timesheets
 * 
 * @param   {object} req.body - Timesheet data
 * @param   {string} req.body.employeeId - UUID of employee
 * @param   {string} req.body.timesheetDate - Date in YYYY-MM-DD format
 * @param   {array}  req.body.taskDetails - Array of task entries
 * @param   {number} req.body.totalHours - Total hours worked
 * @param   {string} [req.body.taskId] - Optional task ID
 * @param   {string} [req.body.customer] - Optional customer name
 * @param   {string} [req.body.project] - Optional project name
 * 
 * @returns {object} Created timesheet with UUID
 * 
 * @throws  {401} Unauthorized - User not authenticated
 * @throws  {403} Forbidden - User cannot create timesheet for another employee
 * @throws  {400} Bad Request - Validation failed or duplicate timesheet exists
 * @throws  {500} Internal Server Error - Unexpected error
 * 
 * @example
 * POST /api/timesheet/daily/create
 * Authorization: Bearer <token>
 * 
 * Body:
 * {
 *   "employeeId": "uuid",
 *   "timesheetDate": "2024-01-15",
 *   "taskDetails": [...],
 *   "totalHours": 8
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Daily timesheet created successfully",
 *   "data": { "timesheetUuid": "uuid" }
 * }
 * 
 * Old route: POST /employee/timesheet
 */
router.post('/daily/create', authenticateJWT, createDailyTimesheetExpressController);
logger.info('✅ Timesheet route registered: POST /timesheet/daily/create');

/**
 * @route   POST /api/timesheet/daily/:employeeId
 * @desc    Get paginated daily timesheets for a specific employee
 * @access  Protected (JWT required)
 * @auth    ORG_USERS - Employees can only view their own, Admin/HR/Managers can view any
 * 
 * @param   {string} req.params.employeeId - UUID of employee
 * @param   {object} req.body.pagination - Pagination options
 * @param   {number} [req.body.pagination.page=0] - Page number
 * @param   {number} [req.body.pagination.pageLimit=20] - Items per page
 * @param   {object} [req.body.filters] - Optional filters
 * @param   {string} [req.body.filters.month] - Month filter (01-12)
 * @param   {string} [req.body.filters.year] - Year filter (YYYY)
 * @param   {string} [req.body.filters.approvalStatus] - Status filter
 * 
 * @returns {array} Array of daily timesheets
 * 
 * @throws  {401} Unauthorized - User not authenticated
 * @throws  {403} Forbidden - User cannot view another employee's timesheets
 * @throws  {500} Internal Server Error - Unexpected error
 * 
 * @example
 * POST /api/timesheet/daily/550e8400-e29b-41d4-a716-446655440000
 * Authorization: Bearer <token>
 * 
 * Body:
 * {
 *   "pagination": { "page": 0, "pageLimit": 20 },
 *   "filters": { "month": "01", "year": "2024" }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Daily timesheets fetched successfully",
 *   "data": [...]
 * }
 * 
 * Old route: POST /employee/timesheets/:id
 */
router.post('/daily/:employeeId', authenticateJWT, listDailyTimesheetsExpressController);
logger.info('✅ Timesheet route registered: POST /timesheet/daily/:employeeId');

/**
 * @route   POST /api/timesheet/daily/reportee
 * @desc    Get daily timesheets of all reportees (for managers/HR)
 * @access  Protected (JWT required)
 * @auth    EMP_MANAGERS, ADMIN_USERS - Managers and HR can view reportee daily timesheets
 * 
 * @param   {object} req.body.pagination - Pagination options
 * @param   {number} [req.body.pagination.page=0] - Page number
 * @param   {number} [req.body.pagination.pageLimit=20] - Items per page
 * @param   {object} [req.body.filters] - Optional filters
 * @param   {string} [req.body.filters.month] - Month filter (01-12)
 * @param   {string} [req.body.filters.year] - Year filter (YYYY)
 * @param   {string} [req.body.filters.startDate] - Start date filter (YYYY-MM-DD)
 * @param   {string} [req.body.filters.endDate] - End date filter (YYYY-MM-DD)
 * @param   {string} [req.body.filters.approvalStatus] - Status filter
 * 
 * @returns {array} Array of reportee daily timesheets
 * 
 * @throws  {401} Unauthorized - User not authenticated
 * @throws  {403} Forbidden - User is not a manager or admin
 * @throws  {500} Internal Server Error - Unexpected error
 * 
 * @example
 * POST /api/timesheet/daily/reportee
 * Authorization: Bearer <token>
 * 
 * Body:
 * {
 *   "pagination": { "page": 0, "pageLimit": 20 },
 *   "filters": { "approvalStatus": "REQUESTED" }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Reportee daily timesheets fetched successfully",
 *   "data": [...]
 * }
 */
router.post('/daily/reportee', authenticateJWT, listReporteeDailyTimesheetsExpressController);
logger.info('✅ Timesheet route registered: POST /timesheet/daily/reportee');

/**
 * @route   PATCH /api/timesheet/daily/:timesheetUuid/approval
 * @desc    Update daily timesheet approval status (approve/reject)
 * @access  Protected (JWT required)
 * @auth    ADMIN_USERS, EMP_MANAGERS, CUSTOMER_USERS - Must be authorized approver
 * 
 * @param   {string} req.params.timesheetUuid - UUID of timesheet
 * @param   {object} req.body - Approval data
 * @param   {string} req.body.approvalStatus - 'APPROVED' or 'REJECTED'
 * @param   {string} [req.body.comment] - Optional approver comment
 * @param   {string} req.body.employeeName - Employee name for email
 * @param   {string} req.body.employeeEmail - Employee email for notification
 * @param   {string} req.body.requestNumber - Timesheet request number
 * @param   {string} req.body.totalHours - Total hours for email
 * @param   {string} req.body.timesheetDate - Timesheet date for email
 * 
 * @returns {object} Success status
 * 
 * @throws  {401} Unauthorized - User not authenticated
 * @throws  {403} Forbidden - User not authorized to approve timesheets
 * @throws  {400} Bad Request - Invalid approval status
 * @throws  {500} Internal Server Error - Unexpected error
 * 
 * @example
 * PATCH /api/timesheet/daily/550e8400-e29b-41d4-a716-446655440000/approval
 * Authorization: Bearer <token>
 * 
 * Body:
 * {
 *   "approvalStatus": "APPROVED",
 *   "comment": "Approved",
 *   "employeeName": "John Doe",
 *   "employeeEmail": "john@example.com",
 *   "requestNumber": "123456",
 *   "totalHours": "8",
 *   "timesheetDate": "2024-01-15"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Daily timesheet approval updated successfully",
 *   "data": { "success": true }
 * }
 * 
 * Old route: PATCH /employee/timesheet/action/:timesheetId
 */
router.patch('/daily/:timesheetUuid/approval', authenticateJWT, updateDailyTimesheetApprovalExpressController);
logger.info('✅ Timesheet route registered: PATCH /timesheet/daily/:timesheetUuid/approval');

// ============================================================================
// WEEKLY TIMESHEET ROUTES
// ============================================================================

/**
 * @route   GET /api/timesheet/weekly/template
 * @route   GET /api/timesheet/weekly/template/:employeeId
 * @desc    Download personalized weekly timesheet Excel template
 * @access  Protected (JWT required)
 * @auth    ORG_USERS - Employees can only download their own template
 * 
 * @param   {string} [req.params.employeeId] - Optional UUID of employee (defaults to authenticated user)
 * 
 * @returns {file} Excel file with pre-filled Sr. No and TASK ID columns
 * 
 * @throws  {401} Unauthorized - User not authenticated
 * @throws  {403} Forbidden - User cannot download template for another employee
 * @throws  {500} Internal Server Error - Template generation failed
 * 
 * @description
 * Generates a personalized Excel template with:
 * - Sr. No column pre-filled (1, 2, 3, ...)
 * - TASK ID column pre-filled based on employee's current task count
 *   (e.g., if employee has 30 tasks, pre-fills TASK031, TASK032, TASK033, ...)
 * - 50 rows pre-filled by default
 * 
 * @example
 * GET /api/timesheet/weekly/template
 * Authorization: Bearer <token>
 * 
 * Response: Excel file download
 * Filename: Weekly_Timesheet_Template_2025-01-15.xlsx
 */
router.get('/weekly/template', authenticateJWT, downloadWeeklyTimesheetTemplateController);
router.get('/weekly/template/:employeeId', authenticateJWT, downloadWeeklyTimesheetTemplateController);
logger.info('✅ Timesheet route registered: GET /timesheet/weekly/template (+ /:employeeId)');

/**
 * @route   POST /api/timesheet/weekly/create
 * @desc    Create a new weekly timesheet
 * @access  Protected (JWT required)
 * @auth    ORG_USERS - Employees can only create their own timesheets
 * 
 * @param   {object} req.body - Weekly timesheet data
 * @param   {string} req.body.employeeId - UUID of employee
 * @param   {string} req.body.weekStartDate - Week start date (YYYY-MM-DD)
 * @param   {string} req.body.weekEndDate - Week end date (YYYY-MM-DD)
 * @param   {array}  req.body.taskDetails - Array of weekly task entries
 * @param   {number} req.body.totalHours - Total hours for the week
 * 
 * @returns {object} Created weekly timesheet with UUID
 * 
 * @throws  {401} Unauthorized - User not authenticated
 * @throws  {403} Forbidden - User cannot create timesheet for another employee
 * @throws  {400} Bad Request - Validation failed or duplicate timesheet exists
 * @throws  {500} Internal Server Error - Unexpected error
 * 
 * @example
 * POST /api/timesheet/weekly/create
 * Authorization: Bearer <token>
 * 
 * Body:
 * {
 *   "employeeId": "uuid",
 *   "weekStartDate": "2024-01-15",
 *   "weekEndDate": "2024-01-21",
 *   "taskDetails": [...],
 *   "totalHours": 40
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Weekly timesheet created successfully",
 *   "data": { "timesheetUuid": "uuid" }
 * }
 * 
 * Old route: POST /employee/weekly-timesheet
 */
router.post('/weekly/create', authenticateJWT, createWeeklyTimesheetExpressController);
logger.info('✅ Timesheet route registered: POST /timesheet/weekly/create');

/**
 * @route   POST /api/timesheet/weekly/:employeeId
 * @desc    Get paginated weekly timesheets for a specific employee
 * @access  Protected (JWT required)
 * @auth    ORG_USERS - Employees can only view their own, Admin/HR/Managers can view any
 * 
 * @param   {string} req.params.employeeId - UUID of employee
 * @param   {object} req.body.pagination - Pagination options
 * @param   {number} [req.body.pagination.page=0] - Page number
 * @param   {number} [req.body.pagination.pageLimit=20] - Items per page
 * @param   {object} [req.body.filters] - Optional filters
 * @param   {string} [req.body.filters.startDate] - Start date filter (YYYY-MM-DD)
 * @param   {string} [req.body.filters.endDate] - End date filter (YYYY-MM-DD)
 * @param   {string} [req.body.filters.approvalStatus] - Status filter
 * 
 * @returns {array} Array of weekly timesheets
 * 
 * @throws  {401} Unauthorized - User not authenticated
 * @throws  {403} Forbidden - User cannot view another employee's timesheets
 * @throws  {500} Internal Server Error - Unexpected error
 * 
 * @example
 * POST /api/timesheet/weekly/550e8400-e29b-41d4-a716-446655440000
 * Authorization: Bearer <token>
 * 
 * Body:
 * {
 *   "pagination": { "page": 0, "pageLimit": 20 },
 *   "filters": { "startDate": "2024-01-01", "endDate": "2024-01-31" }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Weekly timesheets fetched successfully",
 *   "data": [...]
 * }
 * 
 * Old route: POST /employee/weekly-timesheets/:id
 */
router.post('/weekly/:employeeId', authenticateJWT, listWeeklyTimesheetsExpressController);
logger.info('✅ Timesheet route registered: POST /timesheet/weekly/:employeeId');

/**
 * @route   GET /api/timesheet/weekly/:timesheetId/detail
 * @desc    Get detailed weekly timesheet by UUID
 * @access  Protected (JWT required)
 * @auth    ORG_USERS - Employees can only view their own, Admin/HR/Managers can view any
 * 
 * @param   {string} req.params.timesheetId - UUID of weekly timesheet
 * 
 * @returns {object} Weekly timesheet details including all task entries
 * 
 * @throws  {401} Unauthorized - User not authenticated
 * @throws  {403} Forbidden - User cannot view this timesheet
 * @throws  {404} Not Found - Timesheet not found
 * @throws  {500} Internal Server Error - Unexpected error
 * 
 * @example
 * GET /api/timesheet/weekly/550e8400-e29b-41d4-a716-446655440000/detail
 * Authorization: Bearer <token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Weekly timesheet detail fetched successfully",
 *   "data": { "uuid": "...", "taskDetails": [...], ... }
 * }
 * 
 * Old route: GET /employee/weekly-timesheet/:id
 */
router.get('/weekly/:timesheetId/detail', authenticateJWT, getWeeklyTimesheetDetailExpressController);
logger.info('✅ Timesheet route registered: GET /timesheet/weekly/:timesheetId/detail');

/**
 * @route   POST /api/timesheet/weekly/reportee
 * @desc    Get weekly timesheets of all reportees (for managers)
 * @access  Protected (JWT required)
 * @auth    EMP_MANAGERS, ADMIN_USERS - Managers and HR can view reportee timesheets
 * 
 * @param   {object} req.body.pagination - Pagination options
 * @param   {number} [req.body.pagination.page=0] - Page number
 * @param   {number} [req.body.pagination.pageLimit=20] - Items per page
 * @param   {object} [req.body.filters] - Optional filters
 * @param   {string} [req.body.filters.startDate] - Start date filter (YYYY-MM-DD)
 * @param   {string} [req.body.filters.endDate] - End date filter (YYYY-MM-DD)
 * @param   {string} [req.body.filters.approvalStatus] - Status filter
 * 
 * @returns {array} Array of reportee weekly timesheets
 * 
 * @throws  {401} Unauthorized - User not authenticated
 * @throws  {403} Forbidden - User is not a manager or admin
 * @throws  {500} Internal Server Error - Unexpected error
 * 
 * @example
 * POST /api/timesheet/weekly/reportee
 * Authorization: Bearer <token>
 * 
 * Body:
 * {
 *   "pagination": { "page": 0, "pageLimit": 20 },
 *   "filters": { "approvalStatus": "REQUESTED" }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Reportee weekly timesheets fetched successfully",
 *   "data": [...]
 * }
 * 
 * Old route: POST /employee/weekly-timesheets-reportee
 */
router.post('/weekly/reportee', authenticateJWT, listReporteeWeeklyTimesheetsExpressController);
logger.info('✅ Timesheet route registered: POST /timesheet/weekly/reportee');

/**
 * @route   PATCH /api/timesheet/weekly/:timesheetId/approve
 * @desc    Approve or reject a weekly timesheet
 * @access  Protected (JWT required)
 * @auth    ADMIN_USERS, EMP_MANAGERS, CUSTOMER_USERS - Must be authorized approver
 * 
 * @param   {string} req.params.timesheetId - UUID of weekly timesheet
 * @param   {object} req.body - Approval data
 * @param   {string} req.body.approvalStatus - 'APPROVED' or 'REJECTED'
 * @param   {string} [req.body.comment] - Optional approver comment/feedback
 * @param   {object} req.body.employeeDetails - Employee information for email notification
 * @param   {string} req.body.employeeDetails.uuid - Employee UUID
 * @param   {string} req.body.employeeDetails.name - Employee name
 * @param   {string} req.body.employeeDetails.officialEmailId - Employee email
 * 
 * @returns {object} Success status
 * 
 * @throws  {401} Unauthorized - User not authenticated
 * @throws  {403} Forbidden - User not authorized to approve timesheets
 * @throws  {400} Bad Request - Invalid approval status or timesheet already processed
 * @throws  {500} Internal Server Error - Unexpected error
 * 
 * @example
 * PATCH /api/timesheet/weekly/550e8400-e29b-41d4-a716-446655440000/approve
 * Authorization: Bearer <token>
 * 
 * Body:
 * {
 *   "approvalStatus": "APPROVED",
 *   "comment": "Great work!",
 *   "employeeDetails": {
 *     "uuid": "uuid",
 *     "name": "John Doe",
 *     "officialEmailId": "john@example.com"
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Weekly timesheet approval updated successfully",
 *   "data": { "success": true }
 * }
 * 
 * Old route: PATCH /employee/weekly-timesheet/action/:timesheetId
 */
router.patch('/weekly/:timesheetId/approve', authenticateJWT, approveWeeklyTimesheetExpressController);
logger.info('✅ Timesheet route registered: PATCH /timesheet/weekly/:timesheetId/approve');

logger.info('✅ Timesheet routes initialized successfully (12 routes: 1 status + 4 daily + 7 weekly)');

export default router;
