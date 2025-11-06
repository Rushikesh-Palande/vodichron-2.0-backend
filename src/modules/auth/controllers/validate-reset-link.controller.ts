import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import { validateResetLinkService } from '../services/validate-reset-link.service';
import { validateResetLinkSchema } from '../schemas/validate-reset-link.schema';
import { config } from '../../../config';

/**
 * Validate Reset Link Controller
 * ==============================
 * REST API controller for validating password reset links.
 * 
 * Route: POST /api/auth/validate-reset-link
 * Auth: Public (no auth required)
 * Body: { sec: string, key?: string }
 */
export async function validateResetLinkController(req: Request, res: Response) {
  try {
    // Security check: Validate request origin matches allowed CORS origins
    const origin = req.headers.origin || req.headers.referer;
    const allowedOrigins = config.cors.origin;
    
    if (origin && !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      logger.warn('⚠️ Unauthorized origin for reset link validation', {
        origin,
        allowed: allowedOrigins,
        type: 'VALIDATE_RESET_LINK_UNAUTHORIZED_ORIGIN'
      });
      return res.status(403).json({
        success: false,
        message: 'Unauthorized request, this action will be reported',
        timestamp: new Date().toISOString()
      });
    }
    
    const { key, sec } = req.body;
    const clientIp = req.ip || 'unknown';

    // Validate input using schema
    const validation = validateResetLinkSchema.safeParse({ key, sec });
    if (!validation.success) {
      logger.warn('⚠️ Validate reset link validation failed', {
        type: 'VALIDATE_RESET_LINK_VALIDATION_ERROR',
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
    const result = await validateResetLinkService(validatedData.sec, clientIp);

    if (result) {
      return res.status(200).json({
        success: true,
        data: { email: result.email },
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(200).json({
        success: false,
        message: 'Invalid or expired reset link',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: any) {
    logger.error('💥 Validate reset link controller error', { 
      type: 'VALIDATE_RESET_LINK_CONTROLLER_ERROR', 
      error: error?.message, 
      stack: error?.stack 
    });

    return res.status(200).json({
      success: false,
      message: 'Invalid or expired reset link',
      timestamp: new Date().toISOString()
    });
  }
}
