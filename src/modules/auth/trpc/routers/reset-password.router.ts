import { publicProcedure } from '../../../../trpc/trpc';
import { logger, logAuth, logSecurity, PerformanceTimer } from '../../../../utils/logger';
import { resetPasswordSchema } from '../../schemas/reset-password.schema';
import { resetPasswordService } from '../../services/reset-password.service';

/**
 * Reset Password Procedure
 * ========================
 * tRPC procedure for resetting user passwords.
 * 
 * Flow:
 * 1. Validate inputs (email, token, password)
 * 2. Validate reset token
 * 3. Verify user exists and active
 * 4. Hash new password
 * 5. Update password in database
 * 6. Delete used token
 * 
 * Security:
 * - Token validation
 * - Password strength validation (schema)
 * - Single-use tokens
 * - Account status check
 * - Comprehensive audit logging
 * 
 * @input {resetPasswordSchema} - Email, token, new password
 * @returns {success: boolean, message: string}
 * @throws Error for invalid token, inactive account, etc.
 */
export const resetPasswordProcedure = publicProcedure
  .input(resetPasswordSchema)
  .mutation(async ({ ctx, input }) => {
    const { req } = ctx;
    const { email, sec, password } = input;
    const clientIp = req.ip || 'unknown';
    
    const timer = new PerformanceTimer('tRPC ResetPassword');
    
    try {
      logger.info('🔒 Step 1: Password reset initiated via tRPC', {
        type: 'TRPC_PASSWORD_RESET',
        email,
        ip: clientIp,
        timestamp: new Date().toISOString()
      });

      logSecurity('PASSWORD_RESET_ATTEMPT', 'low', { email }, clientIp);

      await resetPasswordService(email, sec, password, clientIp);

      timer.end({ email }, 3000);

      logger.info('✅ Password reset completed successfully', {
        type: 'TRPC_PASSWORD_RESET_SUCCESS',
        email
      });

      logAuth('PASSWORD_RESET', undefined, email, clientIp, true, undefined);

      return {
        success: true,
        message: 'Password reset successful. You can now login with your new password.',
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const errorIp = req.ip || 'unknown';

      logger.error('💥 Reset password tRPC error', {
        type: 'TRPC_PASSWORD_RESET_ERROR',
        error: error?.message,
        email,
        ip: errorIp,
        stack: error?.stack
      });

      logSecurity('PASSWORD_RESET_FAILED', 'medium', {
        error: error.message,
        email
      }, errorIp);

      logAuth('PASSWORD_RESET', undefined, email, errorIp, false, undefined, error.message);

      timer.end({ error: error.message, email }, 3000);

      // Re-throw error for tRPC to handle
      throw error;
    }
  });
