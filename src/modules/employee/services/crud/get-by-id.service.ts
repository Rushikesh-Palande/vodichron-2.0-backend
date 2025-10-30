/**
 * Get Employee By ID Service
 * ==========================
 * 
 * Business logic for fetching employee profile by UUID for Express REST API.
 * This service handles Express Request/Response objects directly.
 * 
 * Note: tRPC has its own implementation in trpc/routers/get-by-id.router.ts
 */

import { Request, Response } from 'express';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { getEmployeeByUuidWithManagerDetail, checkIfEmployeeMappedToCustomer } from '../../stores/employee.store';
import { decryptEmployeeSensitiveFields } from '../../helpers/decrypt-employee-sensitive-fields.helper';
import { ApplicationUserRole } from '../../types/employee.types';

/**
 * Handle Get Employee By ID
 * =========================
 * 
 * Fetches employee profile with authorization checks.
 * Logic matches the old vodichron employeeController.getEmployeeById.
 * 
 * Authorization (from old controller lines 121-161):
 * - Admin/HR/Super users can view any employee
 * - Directors can view their reportees + self
 * - Managers can view their reportees + self
 * - Customers can view mapped employees + self
 * - Regular employees can view self only
 */
export async function handleGetEmployeeById(req: Request, res: Response) {
  const timer = new PerformanceTimer('getEmployeeById_service');
  const employeeId = req.params.id;
  const user = (req as any).user; // From auth middleware

  try {
    logger.info('👤 Fetching employee profile', {
      employeeId,
      requestedBy: user?.uuid,
      requestedByRole: user?.role,
      operation: 'getEmployeeById'
    });

    // Step 1: Validate authentication
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No authentication provided',
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Initial Authorization Check (matching old controller lines 124-126)
    const adminRoles = [ApplicationUserRole.superUser, ApplicationUserRole.admin, ApplicationUserRole.hr];
    const managerRoles = [ApplicationUserRole.manager, ApplicationUserRole.director];
    const customerRoles = [ApplicationUserRole.customer];
    
    // If not admin/manager/customer and not viewing self, deny immediately
    if (
      ![...adminRoles, ...managerRoles, ...customerRoles].includes(user.role) && 
      user.uuid !== employeeId
    ) {
      logger.warn('🚫 Access denied - User not authorized (initial check)', {
        employeeId,
        requestedBy: user.uuid,
        requestedByRole: user.role
      });

      logSecurity('GET_EMPLOYEE_ACCESS_DENIED', 'high', {
        employeeId,
        userRole: user.role,
        reason: 'Insufficient permissions'
      }, undefined, user.uuid);

      return res.status(403).json({
        success: false,
        message: 'Access denied for the operation request.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 3: Fetch Employee from Database (matching old controller line 127)
    logger.debug('📊 Fetching employee from database', { employeeId, userId: user.uuid });

    const employeeDetails = await getEmployeeByUuidWithManagerDetail(employeeId);

    // Check if employee exists (matching old controller lines 129-131)
    if (!employeeDetails) {
      logger.warn('❌ Employee not found', {
        employeeId,
        requestedBy: user.uuid
      });

      logSecurity('GET_EMPLOYEE_NOT_FOUND', 'low', {
        employeeId,
        userRole: user.role
      }, undefined, user.uuid);

      return res.status(404).json({
        success: false,
        message: 'Unable to find the employee details',
        timestamp: new Date().toISOString()
      });
    }

    // Step 4: Detailed Authorization Checks (matching old controller lines 133-150)
    
    // Director authorization check (lines 133-138)
    if (
      user.role === ApplicationUserRole.director &&
      user.uuid !== employeeId &&
      employeeDetails.reportingDirectorId !== user.uuid
    ) {
      logger.warn('🚫 Access denied - Director not authorized', {
        employeeId,
        directorId: user.uuid
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied for the operation request.',
        timestamp: new Date().toISOString()
      });
    }

    // Manager authorization check (lines 139-145)
    if (
      user.role === ApplicationUserRole.manager &&
      user.uuid !== employeeId &&
      employeeDetails.reportingManagerId !== user.uuid
    ) {
      logger.warn('🚫 Access denied - Manager not authorized', {
        employeeId,
        managerId: user.uuid
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied for the operation request.',
        timestamp: new Date().toISOString()
      });
    }

    // Customer authorization check (lines 147-150)
    if (user.role === ApplicationUserRole.customer && user.uuid !== employeeId) {
      const isMappedToCustomer = await checkIfEmployeeMappedToCustomer(employeeId, user.uuid);
      
      if (!isMappedToCustomer) {
        logger.warn('🚫 Access denied - Customer not authorized', {
          employeeId,
          customerId: user.uuid
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied for the operation request.',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Step 5: Decrypt Sensitive Fields (matching old controller lines 152-160)
    logger.debug('🔓 Decrypting sensitive employee fields', { employeeId });

    const employeeWithDecryptedData = await decryptEmployeeSensitiveFields(employeeDetails);

    // Step 6: Success Response
    const duration = timer.end();

    logger.info('✅ Employee profile fetched successfully', {
      employeeId,
      employeeName: employeeDetails.name,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('GET_EMPLOYEE_SUCCESS', 'low', {
      employeeId,
      userRole: user.role,
      duration
    }, undefined, user.uuid);

    return res.status(200).json({
      success: true,
      message: 'Employee profile fetched successfully',
      data: employeeWithDecryptedData,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to fetch employee profile', {
      employeeId,
      requestedBy: user?.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('GET_EMPLOYEE_ERROR', 'critical', {
      employeeId,
      error: error.message,
      duration
    }, undefined, user?.uuid);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch employee profile. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
}
