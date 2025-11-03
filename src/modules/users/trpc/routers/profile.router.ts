/**
 * User Profile tRPC Router
 * =========================
 * 
 * tRPC procedure for fetching authenticated user's profile.
 * Uses protectedProcedure to ensure user is logged in.
 */

import { protectedProcedure } from '../../../../trpc/trpc';
import { logger } from '../../../../utils/logger';
import { getEmployeeByUuidWithManagerDetail } from '../../../employee/stores/crud/employee.store';
import User from '../../../../models/user.model';

/**
 * Get User Profile tRPC Procedure
 * ================================
 * 
 * Returns the authenticated user's profile from tRPC context.
 * Requires authentication (protectedProcedure).
 */
export const getProfileProcedure = protectedProcedure.query(async ({ ctx }) => {
  try {
    logger.info('👤 Fetching user profile via tRPC', {
      userUuid: ctx.user.uuid,
      role: ctx.user.role,
      operation: 'getUserProfile_trpc'
    });

    // Fetch employee name if user is an employee
    let employeeName = null;
    if (ctx.user.type === 'employee') {
      // ctx.user.uuid is from application_users table, need to get employeeId first
      const appUser = await User.findOne({ where: { uuid: ctx.user.uuid } });
      
      logger.debug('🔍 Looking up employee details', {
        userUuid: ctx.user.uuid,
        employeeId: appUser?.employeeId,
        hasAppUser: !!appUser
      });
      
      if (appUser && appUser.employeeId) {
        // Now fetch employee by employeeId
        const employee = await getEmployeeByUuidWithManagerDetail(appUser.employeeId);
        
        logger.debug('👤 Employee lookup result', {
          employeeId: appUser.employeeId,
          found: !!employee,
          name: employee?.name
        });
        
        if (employee) {
          employeeName = employee.name;
        } else {
          logger.warn('⚠️ Employee record not found for user', {
            userUuid: ctx.user.uuid,
            employeeId: appUser.employeeId
          });
        }
      } else {
        logger.warn('⚠️ No employeeId found for user', {
          userUuid: ctx.user.uuid,
          hasAppUser: !!appUser
        });
      }
    }

    // Return user data with employee name
    return {
      success: true,
      data: {
        ...ctx.user,
        name: employeeName
      },
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    logger.error('❌ Failed to fetch user profile via tRPC', {
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
});
