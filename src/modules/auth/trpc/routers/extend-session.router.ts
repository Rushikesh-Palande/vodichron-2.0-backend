import { publicProcedure } from '../../../../trpc/trpc';
import { 
  logger, 
  logAuth, 
  logSecurity, 
  logPerformance, 
  logDatabase,
  PerformanceTimer 
} from '../../../../utils/logger';
import { 
  ACCESS_TOKEN_EXPIRES_IN, 
  REFRESH_TOKEN_MAX_AGE_MS 
} from '../../constants/auth.constants';
import { generateToken } from '../../helpers/generate-token';
import { generateRefreshToken } from '../../helpers/generate-refresh-token';
import { getRefreshCookieOptions } from '../../helpers/get-cookie-options';
import { hashRefreshToken } from '../../helpers/verify-refresh-token';
import {
  findSessionByTokenHash,
  findUserByEmployeeUuid,
  updateSessionToken,
} from '../../store/auth.store';

/**
 * Extend Session Procedure
 * ========================
 * Rotates refresh token and issues a new access token.
 * 
 * Process:
 * 1. Extract refresh token from HTTP-only cookie
 * 2. Validate token and check session status
 * 3. Verify session is not revoked or expired
 * 4. Generate new access token
 * 5. Rotate refresh token (new token + hash)
 * 6. Update session record with new token hash
 * 7. Set new refresh token cookie
 * 8. Return new access token
 * 
 * @returns {ExtendSessionResponse} - New access token and metadata
 * @throws {TRPCError} - AUTH_REFRESH_MISSING, AUTH_REFRESH_INVALID
 */
export const extendSessionProcedure = publicProcedure
  .mutation(async ({ ctx }) => {
    const { req, res } = ctx;
    const clientIp = req.ip || 'unknown';
    
    // Start performance timer
    const timer = new PerformanceTimer('tRPC Extend Session');
    
    try {
      
      // Step 1: Extract refresh token from cookie
      logger.info('🔄 Step 1: Extend session attempt initiated via tRPC');
      logAuth('TOKEN_REFRESH_ATTEMPT', undefined, undefined, clientIp);
      
      const refreshToken = (req as any).cookies?.refreshToken as string | undefined;
      
      if (!refreshToken) {
        logger.warn('⚠️ Step 1.1: Extend session missing refresh token', { type: 'AUTH_EXTEND_VALIDATION_FAIL' });
        logSecurity('TOKEN_REFRESH_MISSING', 'medium', { reason: 'No refresh token in cookie' }, clientIp);
        throw new Error('AUTH_REFRESH_MISSING');
      }
      
      logger.info('✅ Step 1.2: Refresh token found in cookie');
      
      // Step 2: Validate session
      logger.info('🔍 Step 2: Validating session...');
      const tokenHash = hashRefreshToken(refreshToken);
      const session = await findSessionByTokenHash(tokenHash);
      
      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        logger.warn('⚠️ Step 2.1: Invalid or expired refresh token', { type: 'AUTH_EXTEND_DENY' });
        logAuth('TOKEN_REFRESH', undefined, undefined, clientIp, false, undefined, 'Invalid or expired token');
        logSecurity('TOKEN_REFRESH_INVALID', 'medium', { reason: 'Invalid or expired session' }, clientIp);
        throw new Error('AUTH_REFRESH_INVALID');
      }
      
      logger.info('✅ Step 2.2: Session validated successfully', { subjectType: session.subjectType });

      // Step 3: Rebuild payload based on subject type
      if (session.subjectType === 'employee') {
        logger.debug('🔁 Step 3: Extending employee session', { subjectId: session.subjectId, type: 'AUTH_EXTEND_FLOW' });
        
        // session.subjectId is employee.uuid; fetch user by employee uuid
        const user = await findUserByEmployeeUuid(session.subjectId);
        
        // Step 4: Generate new tokens
        logger.info('🎫 Step 4: Generating new access token...');
          const accessToken = generateToken({ uuid: user?.uuid || session.subjectId, role: (user?.role as any) || 'employee', type: 'employee' });
          const { token: newRefresh, hash } = generateRefreshToken();
          const newExpiry = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
        
        // Step 5: Update session
        logger.info('📄 Step 5: Updating session record...');
        const dbTimer = new PerformanceTimer('Update Session - Employee');
        await updateSessionToken(tokenHash, hash, newExpiry);
        dbTimer.end();
        logDatabase('UPDATE', 'sessions', undefined, undefined, 1);
        
          res.cookie('refreshToken', newRefresh, getRefreshCookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
        logger.info('✅ Step 5.1: Session updated and cookie set');
        
        // Log successful token refresh
        logAuth('TOKEN_REFRESH', user?.uuid || session.subjectId, undefined, clientIp, true, (user?.role as any) || 'employee');
        timer.end({ subjectType: 'employee' }, 2000);
        
        logger.info('✅ Session extended (employee)', { type: 'AUTH_EXTEND_SUCCESS', subjectId: session.subjectId });
        
        return {
          success: true, 
          message: 'Session extended', 
          data: { token: accessToken, tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_EXPIRES_IN },
          timestamp: new Date().toISOString() 
        };
        
      } else {
        logger.debug('🔁 Step 3: Extending customer session', { subjectId: session.subjectId, type: 'AUTH_EXTEND_FLOW' });
        
        // Step 4: Generate new tokens
        logger.info('🎫 Step 4: Generating new access token...');
          const accessToken = generateToken({ uuid: session.subjectId, role: 'customer', type: 'customer' });
          const { token: newRefresh, hash } = generateRefreshToken();
          const newExpiry = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
        
        // Step 5: Update session
        logger.info('📄 Step 5: Updating session record...');
        const dbTimer = new PerformanceTimer('Update Session - Customer');
        await updateSessionToken(tokenHash, hash, newExpiry);
        dbTimer.end();
        logDatabase('UPDATE', 'sessions', undefined, undefined, 1);
        
          res.cookie('refreshToken', newRefresh, getRefreshCookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
        logger.info('✅ Step 5.1: Session updated and cookie set');
        
        // Log successful token refresh
        logAuth('TOKEN_REFRESH', session.subjectId, undefined, clientIp, true, 'customer');
        timer.end({ subjectType: 'customer' }, 2000);
        
        logger.info('✅ Session extended (customer)', { type: 'AUTH_EXTEND_SUCCESS', subjectId: session.subjectId });
        
        return {
          success: true, 
          message: 'Session extended', 
          data: { token: accessToken, tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_EXPIRES_IN },
          timestamp: new Date().toISOString() 
        };
      }
      
    } catch (error: any) {
      const errorIp = req.ip || 'unknown';
      
      logger.error('💥 Extend-session controller error', { 
        type: 'TRPC_AUTH_EXTEND_ERROR', 
        error: error?.message,
        ip: errorIp,
        stack: error?.stack 
      });
      
      // Log security event for extend session error
      if (error.message !== 'AUTH_REFRESH_MISSING' && error.message !== 'AUTH_REFRESH_INVALID') {
        logSecurity('TOKEN_REFRESH_ERROR', 'high', { error: error.message }, errorIp !== 'unknown' ? errorIp : undefined);
      }
      
      // End performance timer
      try {
        timer.end({ error: error.message }, 2000);
      } catch {}
      
      throw error;
    }
  });
