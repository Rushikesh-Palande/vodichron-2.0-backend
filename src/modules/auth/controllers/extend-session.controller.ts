import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { handleExtendSession } from '../services/auth.service';

/**
 * Extend Session Controller
 * =========================
 * Rotates refresh token and returns a new access token.
 */
export async function extendSession(req: Request, res: Response) {
  try {
    return await handleExtendSession(req, res);
  } catch (error: any) {
    logger.error('💥 Extend-session controller error', { type: 'AUTH_EXTEND_CONTROLLER_ERROR', error: error?.message, stack: error?.stack });
    return res.status(500).json({ error: { message: 'Internal server error' } });
  }
}
