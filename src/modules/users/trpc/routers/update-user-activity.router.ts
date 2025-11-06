/**
 * Update User Activity tRPC Router
 * =================================
 * tRPC procedure for updating user activity tracking.
 * Uses protectedProcedure to ensure user is logged in.
 * 
 * Based on old vodichron: POST /user/activity
 */

import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { updateUserActivityInputSchema } from '../../schemas/activity/update-user-activity.schemas';
import {
  getEmployeeActivityByEmployeeId,
  updateEmployeeActivityByActivityId,
  insertEmployeeActivity
} from '../../store/activity/employee-activity.store';

/**
 * Activities Constant
 * ===================
 */
const Activities = {
  FIRST_PASSWORD_CHANGE: 'FIRST_PASSWORD_CHANGE',
};

/**
 * Update User Activity tRPC Procedure
 * ====================================
 * Updates or inserts user activity tracking.
 * 
 * Authorization: User can only update their own activities
 * 
 * Input: { employeeId, activityName, value }
 * Output: { success, message, timestamp }
 */
export const updateUserActivityProcedure = protectedProcedure
  .input(updateUserActivityInputSchema)
  .mutation(async ({ input, ctx }) => {
    // ============================================================================
    // STEP 1: Initialize Performance Timer
    // ============================================================================
    const timer = new PerformanceTimer('updateUserActivity_trpc');
    
    try {
      logger.info('📝 Updating user activity via tRPC', {
        userUuid: ctx.user.uuid,
        employeeId: input.employeeId,
        activityName: input.activityName,
        operation: 'updateUserActivity_trpc'
      });

      const loggedInUserId = ctx.user.uuid;

      // ==========================================================================
      // STEP 2: Authorization Check - User Can Only Update Their Own Activities
      // ==========================================================================
      if (loggedInUserId !== input.employeeId) {
        logger.warn('🚫 Unauthorized activity update attempt via tRPC', {
          requestedBy: loggedInUserId,
          targetUser: input.employeeId
        });

        logSecurity('UPDATE_USER_ACTIVITY_UNAUTHORIZED_TRPC', 'high', {
          reason: 'User trying to update another user\'s activity'
        }, undefined, ctx.user.uuid);

        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied for the operation request.'
        });
      }

      // ==========================================================================
      // STEP 3: Validate Activity Name
      // ==========================================================================
      const validActivityNames = Object.values(Activities);
      if (!validActivityNames.includes(input.activityName)) {
        logger.warn('⚠️ Invalid activity name via tRPC', {
          activityName: input.activityName,
          requestedBy: ctx.user.uuid
        });

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Unable to find activity name to update.'
        });
      }

      // ==========================================================================
      // STEP 4: Check if Activity Already Exists
      // ==========================================================================
      logger.debug('🔍 Checking if activity exists', {
        employeeId: input.employeeId,
        activityName: input.activityName
      });

      const existingActivity = await getEmployeeActivityByEmployeeId(
        input.employeeId,
        input.activityName
      );

      // ==========================================================================
      // STEP 5: Update or Insert Activity
      // ==========================================================================
      if (existingActivity.length > 0) {
        // Update existing activity
        const activityId = existingActivity[0].uuid;
        logger.info('✏️ Updating existing activity', {
          activityId,
          activityName: input.activityName,
          employeeId: input.employeeId
        });

        await updateEmployeeActivityByActivityId(activityId, input.value);
      } else {
        // Insert new activity
        logger.info('➕ Inserting new activity', {
          activityName: input.activityName,
          employeeId: input.employeeId
        });

        await insertEmployeeActivity(
          input.employeeId,
          input.activityName,
          input.value
        );
      }

      const duration = timer.end();

      logger.info('✅ User activity updated successfully via tRPC', {
        employeeId: input.employeeId,
        activityName: input.activityName,
        requestedBy: ctx.user.uuid,
        duration: `${duration}ms`
      });

      logSecurity('UPDATE_USER_ACTIVITY_SUCCESS_TRPC', 'low', {
        employeeId: input.employeeId,
        activityName: input.activityName,
        duration
      }, undefined, ctx.user.uuid);

      return {
        success: true,
        message: 'Activity updated',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      // ==========================================================================
      // STEP 6: Error Handling
      // ==========================================================================
      const duration = timer.end();

      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      logger.error('❌ Failed to update user activity via tRPC', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      logSecurity('UPDATE_USER_ACTIVITY_ERROR_TRPC', 'medium', {
        error: error.message,
        duration
      }, undefined, ctx.user.uuid);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
      });
    }
  });
