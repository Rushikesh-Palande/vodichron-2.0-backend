/**
 * Download Weekly Timesheet Template Controller
 * ==============================================
 * Express controller for downloading personalized weekly timesheet Excel template
 * Pre-filled with Sr. No and TASK ID based on employee's task count
 */

import { Request, Response } from 'express';
import { logger } from '../../../../utils/logger';
import { generateWeeklyTimesheetTemplate } from '../../services/weekly/generate-template.service';
import { getEmployeeIdFromUser } from '../../helpers/get-employee-id-from-user';

/**
 * Download Weekly Timesheet Template - Express Controller
 * ========================================================
 * 
 * @param {Request} req - Express request object
 * @param {string} req.params.employeeId - UUID of employee (optional, defaults to authenticated user)
 * @param {Response} res - Express response object
 * 
 * @returns {Promise<void>} Excel file download
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User cannot download template for another employee
 * @throws {500} Internal Server Error - Template generation failed
 * 
 * @description
 * Generates a personalized weekly timesheet Excel template with:
 * - Sr. No column pre-filled (1, 2, 3, ...)
 * - TASK ID column pre-filled based on employee's current task count
 *   (e.g., if employee has 30 tasks, pre-fills TASK031, TASK032, TASK033, ...)
 * - Returns Excel file for download
 * 
 * @example
 * GET /api/timesheet/weekly/template
 * GET /api/timesheet/weekly/template/:employeeId
 */
export async function downloadWeeklyTimesheetTemplateController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Get employeeId from params or fetch from authenticated user
    let employeeId: string | undefined = req.params.employeeId;
    
    if (!employeeId) {
      // Fetch employeeId from users table using JWT user UUID
      const fetchedEmployeeId = await getEmployeeIdFromUser(user.uuid);
      
      if (!fetchedEmployeeId) {
        logger.error('❌ Employee not found for authenticated user', {
          userId: user.uuid,
          userRole: user.role
        });
        
        res.status(404).json({
          success: false,
          message: 'Employee record not found for this user.',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      employeeId = fetchedEmployeeId;
    }

    logger.info('📥 Weekly timesheet template download request received', {
      userId: user.uuid,
      userRole: user.role,
      employeeId,
      endpoint: '/timesheet/weekly/template'
    });

    // Authorization check: users can only download their own template
    // unless they are admin/HR
    const isAdmin = ['super_user', 'admin', 'hr'].includes(user.role);
    
    // For non-admin users, verify this employeeId belongs to the authenticated user
    let isOwnTemplate = false;
    if (!isAdmin) {
      const userEmployeeId = await getEmployeeIdFromUser(user.uuid);
      isOwnTemplate = userEmployeeId === employeeId;
    }

    if (!isAdmin && !isOwnTemplate) {
      logger.warn('🚫 Access denied - User cannot download template for another employee', {
        userId: user.uuid,
        userRole: user.role,
        requestedEmployeeId: employeeId
      });

      res.status(403).json({
        success: false,
        message: 'You can only download your own timesheet template.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Get mode and selectedDate from query parameters
    const mode = (req.query.mode as 'daily' | 'weekly') || 'daily';
    const selectedDateStr = req.query.selectedDate as string | undefined;
    const selectedDate = selectedDateStr ? new Date(selectedDateStr) : undefined;
    
    logger.debug('📅 Template generation parameters', {
      mode,
      selectedDate: selectedDate?.toISOString(),
      employeeId
    });
    
    // Generate personalized template
    const buffer = await generateWeeklyTimesheetTemplate(employeeId, mode, selectedDate);

    // Set response headers for file download
    const filename = `Weekly_Timesheet_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    logger.info('✅ Weekly timesheet template generated and sent', {
      employeeId,
      userId: user.uuid,
      filename,
      fileSize: `${(buffer.length / 1024).toFixed(2)} KB`
    });

    // Send the Excel file
    res.send(buffer);

  } catch (error: any) {
    logger.error('💥 Download weekly timesheet template controller error', {
      type: 'DOWNLOAD_TEMPLATE_CONTROLLER_ERROR',
      error: error?.message,
      stack: error?.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate timesheet template. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
}
