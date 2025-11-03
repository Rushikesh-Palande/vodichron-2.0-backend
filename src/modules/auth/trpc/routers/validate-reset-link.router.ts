import { publicProcedure } from '../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { validateResetLinkSchema } from '../../schemas/validate-reset-link.schema';
import { validateResetLinkService } from '../../services/validate-reset-link.service';

/**
 * Validate Reset Link Procedure
 * =============================
 * tRPC procedure for validating password reset tokens.
 * 
 * Flow:
 * 1. Validate token input
 * 2. Check token exists in database
 * 3. Check token not expired (15 minutes)
 * 4. Return email if valid
 * 
 * Security:
 * - Checks expiration
 * - Logs all attempts
 * - Returns null for invalid/expired tokens
 * 
 * @input {validateResetLinkSchema} - Reset token
 * @returns {email: string} if valid, null otherwise
 */
export const validateResetLinkProcedure = publicProcedure
  .input(validateResetLinkSchema)
  .mutation(async ({ ctx, input }) => {
    const { req } = ctx;
    const { sec } = input;
    const clientIp = req.ip || 'unknown';
    
    const timer = new PerformanceTimer('tRPC ValidateResetLink');
    
    try {
      logger.info('🔍 Step 1: Reset link validation initiated via tRPC', {
        type: 'TRPC_PASSWORD_RESET_VALIDATE',
        tokenPreview: sec.substring(0, 10) + '...',
        ip: clientIp,
        timestamp: new Date().toISOString()
      });

      logSecurity('PASSWORD_RESET_VALIDATE_ATTEMPT', 'low', {
        tokenPreview: sec.substring(0, 10) + '...'
      }, clientIp);

      const result = await validateResetLinkService(sec, clientIp);

      timer.end({ valid: !!result }, 2000);

      if (result) {
        logger.info('✅ Reset link validated successfully', {
          type: 'TRPC_PASSWORD_RESET_VALIDATE_SUCCESS',
          email: result.email
        });

        return {
          success: true,
          data: { email: result.email },
          timestamp: new Date().toISOString()
        };
      } else {
        logger.warn('⚠️ Reset link validation failed', {
          type: 'TRPC_PASSWORD_RESET_VALIDATE_FAILED'
        });

        return {
          success: false,
          message: 'Invalid or expired reset link',
          data: null,
          timestamp: new Date().toISOString()
        };
      }

    } catch (error: any) {
      const errorIp = req.ip || 'unknown';

      logger.error('💥 Validate reset link tRPC error', {
        type: 'TRPC_PASSWORD_RESET_VALIDATE_ERROR',
        error: error?.message,
        ip: errorIp,
        stack: error?.stack
      });

      logSecurity('PASSWORD_RESET_VALIDATE_ERROR', 'medium', {
        error: error.message
      }, errorIp);

      timer.end({ error: error.message }, 2000);

      return {
        success: false,
        message: 'Invalid or expired reset link',
        data: null,
        timestamp: new Date().toISOString()
      };
    }
  });
