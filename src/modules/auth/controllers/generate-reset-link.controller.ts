import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { generateResetLinkService } from '../services/generate-reset-link.service';

/**
 * Generate Reset Link Controller
 * ==============================
 * REST API controller for password reset link generation.
 * 
 * Route: POST /api/auth/generate-reset-link
 * Auth: Public (no auth required)
 * Body: { username: string }
 */
export async function generateResetLinkController(req: Request, res: Response) {
  try {
    const { username } = req.body;
    const clientIp = req.ip || 'unknown';

    await generateResetLinkService(username, clientIp);

    return res.status(200).json({
      success: true,
      message: 'If the email exists, you will receive password reset instructions shortly.',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Generate reset link controller error', { 
      type: 'GENERATE_RESET_LINK_CONTROLLER_ERROR', 
      error: error?.message, 
      stack: error?.stack 
    });

    // Return specific error for account inactive
    if (error.message.includes('deactivated state')) {
      return res.status(403).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Generic success response for security
    return res.status(200).json({
      success: true,
      message: 'If the email exists, you will receive password reset instructions shortly.',
      timestamp: new Date().toISOString()
    });
  }
}
