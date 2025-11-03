import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { resetPasswordService } from '../services/reset-password.service';

/**
 * Reset Password Controller
 * =========================
 * REST API controller for resetting user password.
 * 
 * Route: POST /api/auth/reset-password
 * Auth: Public (no auth required)
 * Body: { email: string, sec: string, password: string }
 */
export async function resetPasswordController(req: Request, res: Response) {
  try {
    const { email, sec, password } = req.body;
    const clientIp = req.ip || 'unknown';

    await resetPasswordService(email, sec, password, clientIp);

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('💥 Reset password controller error', { 
      type: 'RESET_PASSWORD_CONTROLLER_ERROR', 
      error: error?.message, 
      stack: error?.stack 
    });

    // Return specific error messages
    if (error.message.includes('expired')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'RESET_LINK_EXPIRED',
        timestamp: new Date().toISOString()
      });
    }

    if (error.message.includes('deactivated state')) {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: 'ACCOUNT_INACTIVE',
        timestamp: new Date().toISOString()
      });
    }

    // Generic error
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to reset password',
      timestamp: new Date().toISOString()
    });
  }
}
