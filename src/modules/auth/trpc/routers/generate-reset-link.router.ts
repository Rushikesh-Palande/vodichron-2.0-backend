import { publicProcedure } from '../../../../trpc/trpc';
import { logger, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { generateResetLinkSchema } from '../../schemas/generate-reset-link.schema';
import { generateResetLinkService } from '../../services/generate-reset-link.service';

/**
 * Generate Reset Link Procedure
 * =============================
 * tRPC procedure for generating password reset links.
 * 
 * Flow:
 * 1. Validate email input
 * 2. Check user exists (employee or customer)
 * 3. Generate encrypted token
 * 4. Send reset email
 * 
 * Security:
 * - Always returns success (prevents email enumeration)
 * - Comprehensive logging
 * - IP tracking
 * 
 * @input {generateResetLinkSchema} - Email address
 * @returns {success: boolean, message: string}
 */
export const generateResetLinkProcedure = publicProcedure
  .input(generateResetLinkSchema)
  .mutation(async ({ ctx, input }) => {
    const { req } = ctx;
    const { username } = input;
    const clientIp = req.ip || 'unknown';
    
    const timer = new PerformanceTimer('tRPC GenerateResetLink');
    
    try {
      logger.info('🔐 Step 1: Password reset request initiated via tRPC', {
        type: 'TRPC_PASSWORD_RESET_GENERATE',
        username,
        ip: clientIp,
        timestamp: new Date().toISOString()
      });

      logSecurity('PASSWORD_RESET_REQUEST', 'low', { username }, clientIp);

      await generateResetLinkService(username, clientIp);

      timer.end({ username }, 3000);

      logger.info('✅ Password reset link generation completed', {
        type: 'TRPC_PASSWORD_RESET_GENERATE_SUCCESS',
        username
      });

      return {
        success: true,
        message: 'If the email exists, you will receive password reset instructions shortly.',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const errorIp = req.ip || 'unknown';

      logger.error('💥 Generate reset link tRPC error', {
        type: 'TRPC_PASSWORD_RESET_GENERATE_ERROR',
        error: error?.message,
        username,
        ip: errorIp,
        stack: error?.stack
      });

      logSecurity('PASSWORD_RESET_ERROR', 'medium', {
        error: error.message,
        username
      }, errorIp);

      timer.end({ error: error.message, username }, 3000);

      // Return specific error for account inactive
      if (error.message.includes('deactivated state')) {
        throw error;
      }

      // Generic success for security (prevents email enumeration)
      return {
        success: true,
        message: 'If the email exists, you will receive password reset instructions shortly.',
        timestamp: new Date().toISOString()
      };
    }
  });
