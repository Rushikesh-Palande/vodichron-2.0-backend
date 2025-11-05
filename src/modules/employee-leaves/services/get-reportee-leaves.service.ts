/**
 * Get Reportee Leaves Service
 * ============================
 * Business logic for fetching reportee leave records (for managers/HR)
 * 
 * Responsibilities:
 * - Authorization checks (only managers/directors/HR/superUser)
 * - Fetch paginated reportee leave records with filters
 * - Different queries based on role (HR vs Manager)
 * - Comprehensive logging
 */

import { TRPCError } from '@trpc/server';
import { logger, logSecurity, PerformanceTimer } from '../../../utils/logger';
import { GetReporteeLeavesInput } from '../schemas/get-reportee-leaves.schemas';
import { ApplicationUserRole, ReporteeLeave } from '../types/employee-leave.types';
import {
  getPaginatedEmployeeLeavesAll,
  getPaginatedEmployeeLeavesByApproverId,
} from '../stores/leave-application/get-leaves.store';

/**
 * User Context Interface
 */
interface UserContext {
  uuid: string;
  role: ApplicationUserRole;
  email: string;
}

/**
 * Get Reportee Leaves Service
 * ============================
 * 
 * Fetches leave records for reportees based on user role
 * 
 * Business Logic Flow:
 * 1. Authorization check (only managers/directors/HR/superUser allowed)
 * 2. HR/SuperUser: Get ALL employee leaves (excluding self)
 * 3. Manager/Director: Get leaves where user is approver
 * 4. Return paginated reportee leave records
 * 
 * Authorization Rules:
 * - Regular employees: Forbidden
 * - Managers/Directors: Can view leaves where they are approvers
 * - HR/SuperUser: Can view all employee leaves
 * 
 * @param input - Pagination and filters
 * @param user - Authenticated user context
 * @returns Paginated reportee leave records
 * @throws TRPCError FORBIDDEN if user lacks permission
 * @throws TRPCError INTERNAL_SERVER_ERROR for unexpected errors
 */
export async function getReporteeLeaves(
  input: GetReporteeLeavesInput,
  user: UserContext
): Promise<ReporteeLeave[]> {
  const timer = new PerformanceTimer('getReporteeLeaves_service');
  
  try {
    logger.info('🔍 Fetching reportee leaves', {
      page: input.pagination.page,
      pageLimit: input.pagination.pageLimit,
      filters: input.filters,
      requestedBy: user.uuid,
      userRole: user.role,
      operation: 'getReporteeLeaves'
    });

    // Authorization Check
    // Only managers, directors, HR, and superUser can view reportee leaves
    const allowedRoles = [
      ApplicationUserRole.manager,
      ApplicationUserRole.director,
      ApplicationUserRole.hr,
      ApplicationUserRole.superUser,
    ];

    if (!allowedRoles.includes(user.role)) {
      logger.warn('🚫 Access denied - Regular employee trying to view reportee leaves', {
        userId: user.uuid,
        userRole: user.role
      });

      logSecurity('GET_REPORTEE_LEAVES_ACCESS_DENIED', 'high', {
        userRole: user.role,
        reason: 'Regular employee trying to view reportee leaves'
      }, undefined, user.uuid);

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied. Only managers, directors, and HR can view reportee leaves.'
      });
    }

    let reporteeLeaves: ReporteeLeave[] = [];

    // HR and SuperUser: Get all employee leaves (except self)
    if (user.role === ApplicationUserRole.hr || user.role === ApplicationUserRole.superUser) {
      logger.debug('📊 Fetching all employee leaves (HR/SuperUser)', {
        excludeUserId: user.uuid,
        page: input.pagination.page,
        pageLimit: input.pagination.pageLimit
      });

      reporteeLeaves = await getPaginatedEmployeeLeavesAll(
        user.uuid,
        input.filters || {},
        input.pagination.page,
        input.pagination.pageLimit
      );

      logger.debug('✅ All employee leaves fetched', {
        count: reporteeLeaves.length
      });
    } 
    // Manager/Director: Get leaves where they are approver
    else if (user.role === ApplicationUserRole.manager || user.role === ApplicationUserRole.director) {
      logger.debug('📊 Fetching reportee leaves by approver (Manager/Director)', {
        approverId: user.uuid,
        page: input.pagination.page,
        pageLimit: input.pagination.pageLimit
      });

      reporteeLeaves = await getPaginatedEmployeeLeavesByApproverId(
        user.uuid,
        input.filters || {},
        input.pagination.page,
        input.pagination.pageLimit
      );

      logger.debug('✅ Reportee leaves fetched', {
        count: reporteeLeaves.length
      });
    }

    const duration = timer.end();
    
    logger.info('✅ Reportee leaves fetched successfully', {
      count: reporteeLeaves.length,
      page: input.pagination.page,
      userRole: user.role,
      duration: `${duration}ms`
    });

    return reporteeLeaves;

  } catch (error: any) {
    const duration = timer.end();
    
    logger.error('❌ Failed to fetch reportee leaves', {
      error: error.message,
      userRole: user.role,
      duration: `${duration}ms`
    });

    // Re-throw TRPCError as-is
    if (error instanceof TRPCError) {
      throw error;
    }

    // Wrap other errors
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to fetch reportee leaves: ${error.message}`
    });
  }
}
