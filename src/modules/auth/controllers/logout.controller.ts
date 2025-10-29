import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { handleLogout } from '../services/auth.service';

/**
 * Logout Controller
 * =================
 * Revokes refresh session, clears cookie, and returns null token.
 */
export async function logoutUser(req: Request, res: Response) {
  try {
    return await handleLogout(req, res);
  } catch (error: any) {
    logger.error('💥 Logout controller error', { type: 'AUTH_LOGOUT_CONTROLLER_ERROR', error: error?.message, stack: error?.stack });
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
}
