import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { handleLogin } from '../services/auth.service';

/**
 * Login Controller
 * ================
 * Handles authentication for all roles (employee + customer).
 */
export async function authLogin(req: Request, res: Response) {
  try {
    return await handleLogin(req, res);
  } catch (error: any) {
    logger.error('💥 Login controller error', { type: 'AUTH_LOGIN_CONTROLLER_ERROR', error: error?.message, stack: error?.stack });
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
}
