/**
 * Check User Exists Service
 * ==========================
 * Business logic for checking if user exists by email.
 * 
 * Based on old backend: userController.checkIfUserExists (lines 64-72)
 * 
 * Endpoint: POST /user/check-exists
 * Authorization: Authenticated users
 * Returns: boolean (true if exists, false otherwise)
 */

import { Request, Response } from 'express';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { checkUserExistsInputSchema } from '../../schemas/crud/check-user-exists.schemas';
import { getUserByEmail } from '../../store/crud/user-crud.store';

/**
 * Handle Check User Exists
 * =========================
 * Checks if a user exists by email address.
 * Used for validation before user registration.
 * 
 * Old backend logic (userController.ts:64-72):
 * 1. Extract email from body
 * 2. Query getUserByEmail
 * 3. Return true if found, false otherwise
 */
export async function handleCheckUserExists(req: Request, res: Response) {
  const timer = new PerformanceTimer('checkUserExists_service');
  const user = (req as any).user;

  try {
    logger.info('🔍 Checking if user exists', {
      requestedBy: user?.uuid,
      operation: 'checkUserExists'
    });

    // Step 1: Validate authentication
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No authentication provided',
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Validate input with Zod schema
    const parseResult = checkUserExistsInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));

      logger.warn('⚠️ Check user exists validation failed', {
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

    const { email } = parseResult.data;

    // Step 3: Check if user exists by email
    logger.debug('🔍 Querying user by email', { email });

    const userProfile = await getUserByEmail(email);

    const duration = timer.end();

    // Step 4: Return boolean result
    const exists = !!userProfile;

    logger.info('✅ User existence check completed', {
      email,
      exists,
      requestedBy: user.uuid,
      duration: `${duration}ms`
    });

    logSecurity('CHECK_USER_EXISTS_SUCCESS', 'low', {
      email,
      exists,
      duration
    }, undefined, user.uuid);

    // Old backend returns plain boolean
    return res.status(200).json(exists);

  } catch (error: any) {
    const duration = timer.end();

    logger.error('❌ Failed to check user existence', {
      requestedBy: user?.uuid,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    logSecurity('CHECK_USER_EXISTS_ERROR', 'medium', {
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
