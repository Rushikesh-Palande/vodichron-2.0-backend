import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { generateResetLinkService } from '../services/generate-reset-link.service';
import { generateResetLinkSchema } from '../schemas/generate-reset-link.schema';

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

    // Validate input using schema
    const validation = generateResetLinkSchema.safeParse({ username });
    if (!validation.success) {
      logger.warn('⚠️ Generate reset link validation failed', {
        type: 'GENERATE_RESET_LINK_VALIDATION_ERROR',
        issues: validation.error.issues
      });
      return res.status(400).json({
        success: false,
        message: validation.error.issues[0]?.message || 'Validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    const validatedData = validation.data;
    await generateResetLinkService(validatedData.username, clientIp);

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
