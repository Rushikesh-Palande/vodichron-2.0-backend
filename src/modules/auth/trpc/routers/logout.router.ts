import { publicProcedure } from '../../../../trpc/trpc';
import { 
  logger, 
  logAuth, 
  logSecurity, 
  logPerformance, 
  logDatabase,
  PerformanceTimer 
} from '../../../../utils/logger';
import { hashRefreshToken } from '../../helpers/verify-refresh-token';
import {
  findSessionByTokenHash,
  findUserByEmployeeUuid,
  updateCustomerLastLoginByCustomerId,
  updateUserLastLogin,
  upsertEmployeeOnlineStatus,
  revokeSessionByTokenHash,
} from '../../store/auth.store';

/**
 * Logout Procedure
 * ================
 * Revokes refresh session, clears cookie, and updates audit fields.
 * 
 * Process:
 * 1. Extract refresh token from cookie
 * 2. Find and validate session
 * 3. Revoke session in database
 * 4. Update user activity (last login, online status)
 * 5. Clear refresh token cookie
 * 6. Return success response
 * 
 * @returns {LogoutResponse} - Success status and metadata
 */
export const logoutProcedure = publicProcedure
  .mutation(async ({ ctx }) => {
    const { req, res } = ctx;
    const clientIp = req.ip || 'unknown';
    
    // Start performance timer
    const timer = new PerformanceTimer('tRPC Logout');
    
    try {
      
      // Step 1: Extract refresh token
      logger.info('🚪 Step 1: Logout attempt initiated via tRPC');
      logAuth('LOGOUT_ATTEMPT', undefined, undefined, clientIp);
      
      const refreshToken = (req as any).cookies?.refreshToken as string | undefined;
      
      if (refreshToken) {
        logger.info('🔍 Step 1.1: Refresh token found, processing logout...');
        
        // Step 2: Find and revoke session
        const tokenHash = hashRefreshToken(refreshToken);
        const session = await findSessionByTokenHash(tokenHash);
        
        if (session && !session.revokedAt) {
          logger.info('📄 Step 2.1: Valid session found, revoking...');
          const dbTimer = new PerformanceTimer('Revoke Session');
          await revokeSessionByTokenHash(tokenHash);
          dbTimer.end();
          logDatabase('UPDATE', 'sessions', undefined, undefined, 1);
          logger.info('✅ Step 2.2: Session revoked successfully');
          
          // Step 3: Update user activity
          if (session.subjectType === 'employee') {
            logger.info('📋 Step 3: Updating employee activity...');
            // Update lastLogin for user linked to this employee and set offline for employee
            const user = await findUserByEmployeeUuid(session.subjectId);
            if (user?.uuid) {
              await updateUserLastLogin(user.uuid);
            }
            await upsertEmployeeOnlineStatus(session.subjectId, 'OFFLINE');
            logger.info('✅ Step 3.1: Employee set to OFFLINE');
            
            // Log successful logout
            logAuth('LOGOUT', user?.uuid || session.subjectId, undefined, clientIp, true, (user?.role as any) || 'employee');
          } else {
            logger.info('📋 Step 3: Updating customer activity...');
            await updateCustomerLastLoginByCustomerId(session.subjectId);
            logger.info('✅ Step 3.1: Customer activity updated');
            
            // Log successful logout
            logAuth('LOGOUT', session.subjectId, undefined, clientIp, true, 'customer');
          }
        } else {
          logger.debug('ℹ️ Step 2.1: Logout with missing/expired session', { type: 'AUTH_LOGOUT_NOOP' });
        }
      } else {
        logger.debug('ℹ️ Step 1.1: Logout without refresh token', { type: 'AUTH_LOGOUT_NO_TOKEN' });
      }
      
      // Step 4: Clear cookie
      logger.info('🍪 Step 4: Clearing refresh token cookie...');
      res.clearCookie('refreshToken');
      logger.info('✅ Step 4.1: Cookie cleared successfully');
      
      // Log performance
      timer.end({ hasToken: !!refreshToken }, 1000);
      
      logger.info('✅ Logout successful', { type: 'AUTH_LOGOUT_SUCCESS' });
      
      return {
        success: true, 
        message: 'Logout successful', 
        data: { cleared: true }, 
        timestamp: new Date().toISOString() 
      };
      
    } catch (error: any) {
      const errorIp = req.ip || 'unknown';
      
      logger.error('💥 Logout controller error', { 
        type: 'TRPC_AUTH_LOGOUT_ERROR', 
        error: error?.message,
        ip: errorIp,
        stack: error?.stack 
      });
      
      // Log security event for logout error
      logSecurity('LOGOUT_ERROR', 'medium', { error: error.message }, errorIp !== 'unknown' ? errorIp : undefined);
      
      // End performance timer
      try {
        timer.end({ error: error.message }, 1000);
      } catch {}
      
      throw error;
    }
  });
