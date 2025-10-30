/**
 * Get Employees List Service
 * ===========================
 * 
 * Business logic for fetching paginated employee list for Express REST API.
 * This service handles Express Request/Response objects directly.
 * 
 * Note: tRPC has its own implementation in employee.service.ts
 */

import { Request, Response } from 'express';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { getPaginatedEmployees } from '../../stores/employee.store';
import { decryptEmployeeSensitiveFields } from '../../helpers/decrypt-employee-sensitive-fields.helper';
import { ApplicationUserRole } from '../../types/employee.types';

/**
 * Handle Get Employees List
 * =========================
 * 
 * Fetches paginated list of employees with filters.
 * Authorization: Admin, HR, Directors, Managers only
 * 
 * Request body:
 * {
 *   pagination: { page: 1, pageLimit: 20 },
 *   filters: { designation?, department?, reportingManagerId?, reportingManagerRole? }
 * }
 */
export async function handleGetEmployeesList(req: Request, res: Response) {
  const timer = new PerformanceTimer('getEmployeesList_service');
  const user = (req as any).user;

  try {
    logger.info('📊 Fetching employees list', {
      requestedBy: user?.uuid,
      requestedByRole: user?.role,
      operation: 'getEmployeesList'
    });

    // Step 1: Validate authentication
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No authentication provided',
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Authorization Check (matching old controller - only admins/directors/managers)
    const allowedRoles = [
      ApplicationUserRole.superUser,
      ApplicationUserRole.admin,
      ApplicationUserRole.hr,
      ApplicationUserRole.director,
      ApplicationUserRole.manager
    ];

    if (!allowedRoles.includes(user.role)) {
      logger.warn('🚫 Access denied - User not authorized to view employees list', {
        requestedBy: user.uuid,
        requestedByRole: user.role
      });

      logSecurity('GET_EMPLOYEES_LIST_ACCESS_DENIED', 'high', {
        userRole: user.role,
        reason: 'Insufficient permissions'
      }, undefined, user.uuid);

      return res.status(403).json({
        success: false,
        message: 'Access denied for the operation request.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 3: Extract pagination and filters from request body
    const { pagination, filters } = req.body;
    let page = pagination?.page || 1;
    const pageLimit = pagination?.pageLimit || 20;

    // Ensure page is at least 1
    if (!page || page < 1) {
      page = 1;
    }

    logger.debug('📄 Pagination and filters', { page, pageLimit, filters });

    // Step 4: Fetch employees from database
    const employees = await getPaginatedEmployees(user.uuid, filters, page, pageLimit);

    // Step 5: Decrypt sensitive fields for all employees
    logger.debug('🔓 Decrypting sensitive fields for employees', {
      count: employees.length
    });

    const employeesWithDecryptedData = await Promise.all(
      employees.map(async (employee) => await decryptEmployeeSensitiveFields(employee))
    );

    // Step 6: Success Response
    const duration = timer.end();

    logger.info('✅ Employees list fetched successfully', {
      count: employeesWithDecryptedData.length,
      page,
      pageLimit,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('GET_EMPLOYEES_LIST_SUCCESS', 'low', {
      count: employeesWithDecryptedData.length,
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    return res.status(200).json({
      success: true,
      message: 'Employees list fetched successfully',
      data: employeesWithDecryptedData,
      pagination: {
        page,
        pageLimit,
        totalRecords: employeesWithDecryptedData.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to fetch employees list', {
      requestedBy: user?.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('GET_EMPLOYEES_LIST_ERROR', 'critical', {
      error: error.message,
      duration
    }, undefined, user?.uuid);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch employees list. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
}
