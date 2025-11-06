/**
 * Update User Activity Service
 * ==============================
 * Business logic for tracking user activities.
 * 
 * Based on old backend: userController.updateUserActivity (lines 187-205)
 * 
 * Endpoint: POST /user/activity
 * Authorization: User can only update their own activities
 * Used for tracking: FIRST_PASSWORD_CHANGE, etc.
 */

import { Request, Response } from 'express';
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
 * Valid activity names that can be tracked
 */
const Activities = {
  FIRST_PASSWORD_CHANGE: 'FIRST_PASSWORD_CHANGE',
  // Add other activities as needed
};

/**
 * Handle Update User Activity
 * ============================
 * Updates or inserts user activity tracking.
 * 
 * Old backend logic (userController.ts:187-205):
 * 1. Extract activityName, value, employeeId from body
 * 2. Authorization: User can only update their own activities (lines 191-192)
 * 3. Validate activityName exists in Activities enum (lines 193-195)
 * 4. Get existing activity by employeeId and activityName (line 196)
 * 5. If exists: updateEmployeeActivityByActivityId (lines 197-199)
 * 6. If not exists: insertEmployeeActivity (lines 200-201)
 * 7. Return success message
 */
export async function handleUpdateUserActivity(req: Request, res: Response) {
  const timer = new PerformanceTimer('updateUserActivity_service');
  const user = (req as any).user;

  try {
    logger.info('📝 Updating user activity', {
      requestedBy: user?.uuid,
      operation: 'updateUserActivity'
    });

    // Step 1: Validate authentication
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No authentication provided',
        timestamp: new Date().toISOString()
      });
    }

    const loggedInUserId = user.uuid;

    // Step 2: Validate input with Zod schema
    const parseResult = updateUserActivityInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));

      logger.warn('⚠️ Update user activity validation failed', {
        errors,
        requestedBy: user.uuid
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
        timestamp: new Date().toISOString()
      });
    }

    const activity = parseResult.data;

    // Step 3: Authorization check - User can only update their own activities
    // (Old backend lines 191-192)
    if (loggedInUserId !== activity.employeeId) {
      logger.warn('🚫 Unauthorized activity update attempt', {
        requestedBy: loggedInUserId,
        targetUser: activity.employeeId
      });

      logSecurity('UPDATE_USER_ACTIVITY_UNAUTHORIZED', 'high', {
        reason: 'User trying to update another user\'s activity'
      }, undefined, user.uuid);

      return res.status(403).json({
        success: false,
        message: 'Access denied for the operation request.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 4: Validate activity name
    // (Old backend lines 193-195)
    const validActivityNames = Object.values(Activities);
    if (!validActivityNames.includes(activity.activityName)) {
      logger.warn('⚠️ Invalid activity name', {
        activityName: activity.activityName,
        requestedBy: user.uuid
      });

      return res.status(400).json({
        success: false,
        message: 'Unable to find activity name to update.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 5: Check if activity already exists
    // (Old backend line 196)
    logger.debug('🔍 Checking if activity exists', {
      employeeId: activity.employeeId,
      activityName: activity.activityName
    });

    const existingActivity = await getEmployeeActivityByEmployeeId(
      activity.employeeId,
      activity.activityName
    );

    // Step 6: Update or insert activity
    if (existingActivity.length > 0) {
      // Update existing activity (lines 197-199)
      const activityId = existingActivity[0].uuid;
      logger.info('✏️ Updating existing activity', {
        activityId,
        activityName: activity.activityName,
        employeeId: activity.employeeId
      });

      await updateEmployeeActivityByActivityId(activityId, activity.value);
    } else {
      // Insert new activity (lines 200-201)
      logger.info('➕ Inserting new activity', {
        activityName: activity.activityName,
        employeeId: activity.employeeId
      });

      await insertEmployeeActivity(
        activity.employeeId,
        activity.activityName,
        activity.value
      );
    }

    const duration = timer.end();

    logger.info('✅ User activity updated successfully', {
      employeeId: activity.employeeId,
      activityName: activity.activityName,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('UPDATE_USER_ACTIVITY_SUCCESS', 'low', {
      employeeId: activity.employeeId,
      activityName: activity.activityName,
      duration
    }, undefined, user.uuid);

    // Old backend returns plain text message
    return res.status(200).send('Activity updated');

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to update user activity', {
      requestedBy: user?.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('UPDATE_USER_ACTIVITY_ERROR', 'medium', {
      error: error.message,
      duration
    }, undefined, user?.uuid);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}
