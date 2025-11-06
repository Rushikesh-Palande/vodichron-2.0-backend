import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { handleLogin } from '../services/auth.service';
import { loginSchema } from '../schemas/auth.schemas';

/**
 * Login Controller
 * ================
 * Handles authentication for all roles (employee + customer).
 * 
 * Validates:
 * - Email format in username field
 * - Password presence (minimum 6 characters at input level)
 */
export async function authLogin(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    // Validate input using schema
    const validation = loginSchema.safeParse({ username, password });
    if (!validation.success) {
      logger.warn('⚠️ Login validation failed', {
        type: 'LOGIN_VALIDATION_ERROR',
        issues: validation.error.issues
      });
      return res.status(400).json({
        success: false,
        message: validation.error.issues[0]?.message || 'Validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    return await handleLogin(req, res);
  } catch (error: any) {
    logger.error('💥 Login controller error', { type: 'AUTH_LOGIN_CONTROLLER_ERROR', error: error?.message, stack: error?.stack });
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
}
