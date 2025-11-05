import { router, publicProcedure } from '../../../trpc/trpc';
import { 
  logger, 
  logAuth, 
  logSecurity, 
  logPerformance, 
  logDatabase,
  PerformanceTimer 
} from '../../../utils/logger';
import { loginSchema } from '../schemas/auth.schemas';
import { 
  ACCESS_TOKEN_EXPIRES_IN, 
  REFRESH_TOKEN_MAX_AGE_MS 
} from '../constants/auth.constants';
import { comparePasswords } from '../helpers/compare-passwords';
import { generateToken } from '../helpers/generate-token';
import { generateRefreshToken } from '../helpers/generate-refresh-token';
import { getClientMetadata } from '../helpers/get-client-metadata';
import { getRefreshCookieOptions } from '../helpers/get-cookie-options';
import { hashRefreshToken } from '../helpers/verify-refresh-token';
import {
  findCustomerAccessByCustomerId,
  findCustomerByEmail,
  findEmployeeByOfficialEmail,
  findSessionByTokenHash,
  findUserByEmployeeUuid,
  updateCustomerLastLoginByCustomerId,
  updateSessionToken,
  updateUserLastLogin,
  upsertEmployeeOnlineStatus,
  createSession,
  revokeSessionByTokenHash,
} from '../store/auth.store';

/**
 * Vodichron HRMS Auth tRPC Router
 * ================================
 * Handles authentication operations for the Vodichron HRMS system using tRPC.
 * 
 * Features:
 * - Dual authentication path (Employee & Customer)
 * - Secure password verification with bcrypt
 * - JWT-based access tokens with short expiry (15 minutes)
 * - Refresh token rotation for extended sessions
 * - HTTP-only secure cookies for refresh tokens
 * - Session tracking with IP and User-Agent logging
 * - Employee online status management
 * - Comprehensive security logging and audit trail
 * 
 * Procedures:
 * - login: Authenticates user and creates session
 * - extendSession: Refreshes access token using refresh token
 * - logout: Terminates session and revokes refresh token
 */
export const authRouter = router({
  /**
   * Login Procedure
   * ===============
   * Authenticates users (employees or customers) and establishes secure session.
   * 
   * Authentication Flow:
   * 1. Extract and validate client metadata (IP, User-Agent)
   * 2. Determine user type (Employee or Customer)
   * 3. Verify credentials (email/password)
   * 4. Check account status (ACTIVE required)
   * 5. Generate JWT access token (15 min expiry)
   * 6. Generate refresh token (7 days expiry)
   * 7. Create session record in database
   * 8. Set HTTP-only secure cookie
   * 9. Update user activity (last login, online status)
   * 10. Return success response with tokens
   * 
   * Security Features:
   * - Password hashing with bcrypt
   * - Refresh token hashing in database
   * - HTTP-only secure cookies
   * - Comprehensive audit logging
   * - IP and User-Agent tracking
   * 
   * @input {loginSchema} - Username (email) and password
   * @returns {LoginResponse} - Success status, tokens, and user subject data
   * @throws {TRPCError} - AUTH_INVALID_CREDENTIALS, AUTH_ACCOUNT_INACTIVE
   */
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ ctx, input }) => {
      const { req, res } = ctx;
      const { username, password } = input;
      
      // Start performance timer for login operation
      const timer = new PerformanceTimer('tRPC Login');
      
      try {
        
        // Step 1: Extract and log authentication attempt
        logger.info('🔐 Step 1: Login attempt initiated via tRPC', { 
          type: 'TRPC_AUTH_LOGIN', 
          username,
          timestamp: new Date().toISOString()
        });

        // Step 2: Extract client metadata for security tracking
        logger.info('📍 Step 2: Extracting client metadata...');
        const clientMetadata = getClientMetadata(req.headers as any, req.ip as any);
        const { ip, userAgent } = clientMetadata;
        logger.info(`✅ Step 2.1: Client IP: ${ip}`);
        logger.info(`🌐 Step 2.2: User-Agent: ${userAgent || 'Unknown'}`);
        
        // Log security event for login attempt
        logSecurity('LOGIN_ATTEMPT', 'low', { username, userAgent }, ip || undefined);
        
        // Step 3: Use authentication constants from centralized config
        const REFRESH_MAX_AGE_MS = REFRESH_TOKEN_MAX_AGE_MS;
        const ACCESS_EXPIRES_IN = ACCESS_TOKEN_EXPIRES_IN;
        logger.info(`⚙️ Step 3: Token configuration set - Access: ${ACCESS_EXPIRES_IN}, Refresh: ${REFRESH_MAX_AGE_MS}ms`);

        // Step 4: Employee authentication path
        logger.info('🔍 Step 4: Checking employee authentication path...');
        const employee = await findEmployeeByOfficialEmail(username);
        
      if (employee) {
          logger.debug('👤 Step 4.1: Employee path selected', { employeeId: employee.uuid, type: 'AUTH_LOGIN_FLOW' });
        const user = await findUserByEmployeeUuid(employee.uuid);
          
        if (!user || user.status !== 'ACTIVE') {
            logger.warn('❌ Step 4.2: Login failed - inactive or missing user', { 
              type: 'AUTH_LOGIN_DENY', 
              reason: 'inactive_or_missing_user', 
              employeeId: employee.uuid 
            });
          throw new Error('AUTH_INVALID_CREDENTIALS');
        }
          
          logger.info('✅ Step 4.3: User found and active', { userUuid: user.uuid, status: user.status });
          
        const ok = await comparePasswords(password, user.password);
        if (!ok) {
            logger.warn('❌ Step 4.4: Login failed - invalid password', { type: 'AUTH_LOGIN_DENY', userUuid: user.uuid });
            // Log auth failure
            logAuth('LOGIN', user.uuid, username, ip || undefined, false, user.role, 'Invalid password');
            logSecurity('FAILED_LOGIN_ATTEMPT', 'medium', { reason: 'Invalid password', userUuid: user.uuid }, ip || undefined);
            throw new Error('AUTH_INVALID_CREDENTIALS');
          }

          logger.info('🔑 Step 4.5: Password verified successfully');
          
          // Step 5: Update user activity tracking
          logger.info('📋 Step 5: Updating employee activity tracking...');
        await updateUserLastLogin(user.uuid);
        await upsertEmployeeOnlineStatus(employee.uuid, 'ONLINE');
          logger.info('✅ Step 5.1: Activity tracking updated successfully');

          // Step 6: Generate authentication tokens
          logger.info('🎫 Step 6: Generating authentication tokens...');
        const accessToken = generateToken({ uuid: user.uuid, role: user.role, email: employee.officialEmailId || undefined, type: 'employee' });
        const { token: refreshToken, hash } = generateRefreshToken();
          logger.info('✅ Step 6.1: Access and refresh tokens generated');
          
          // Step 7: Create session record
          logger.info('🗄️ Step 7: Creating session record...');
          const dbTimer = new PerformanceTimer('Create Session - Employee');
          // Store employee.uuid as session subjectId (NOT user.uuid) to align with OnlineStatus FK
        await createSession({ subjectId: employee.uuid, subjectType: 'employee', tokenHash: hash, userAgent, ipAddress: ip, expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_MS) });
          dbTimer.end();
          logDatabase('INSERT', 'sessions', undefined, undefined, 1);
          logger.info('✅ Step 7.1: Session record created successfully');
          
          // Step 8: Set HTTP-only cookie
          logger.info('🍪 Step 8: Setting HTTP-only refresh token cookie...');
        res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(REFRESH_MAX_AGE_MS));
          logger.info('✅ Step 8.1: Cookie set successfully');
          
          // Log successful authentication
          logAuth('LOGIN', user.uuid, username, ip || undefined, true, user.role);
          logSecurity('SUCCESSFUL_LOGIN', 'low', { userType: 'employee', role: user.role }, ip || undefined, user.uuid);
          
          // Log performance metrics
          const loginDuration = timer.end({ username, userType: 'employee' }, 3000);
          
          logger.info('✅ Employee login successful', { type: 'AUTH_LOGIN_EMPLOYEE', employeeId: employee.uuid, userUuid: user.uuid });

        return {
          success: true,
          message: 'Login successful',
          data: {
            token: accessToken,
            tokenType: 'Bearer',
            expiresIn: ACCESS_EXPIRES_IN,
            subject: { id: user.uuid, type: 'employee', role: user.role, email: employee.officialEmailId || null },
          },
          timestamp: new Date().toISOString(),
        };
      }

        // Step 9: Customer authentication path
        logger.info('🔍 Step 9: Checking customer authentication path...');
      const customer = await findCustomerByEmail(username);
        
      if (customer) {
          logger.debug('🏢 Step 9.1: Customer path selected', { customerId: customer.uuid, type: 'AUTH_LOGIN_FLOW' });
        const access = await findCustomerAccessByCustomerId(customer.uuid);
          
          if (!access || access.status !== 'ACTIVE') {
            logger.warn('❌ Step 9.2: Login failed - inactive or missing customer access', { 
              type: 'AUTH_LOGIN_DENY', 
              customerId: customer.uuid 
            });
            throw new Error('AUTH_INVALID_CREDENTIALS');
          }
          
          logger.info('✅ Step 9.3: Customer access found and active');
          
        const ok = await comparePasswords(password, access.password);
          if (!ok) {
            logger.warn('❌ Step 9.4: Login failed - invalid customer password', { 
              type: 'AUTH_LOGIN_DENY', 
              customerId: customer.uuid 
            });
            // Log auth failure for customer
            logAuth('LOGIN', customer.uuid, username, ip || undefined, false, 'customer', 'Invalid password');
            logSecurity('FAILED_LOGIN_ATTEMPT', 'medium', { reason: 'Invalid password', customerId: customer.uuid, userType: 'customer' }, ip || undefined);
            throw new Error('AUTH_INVALID_CREDENTIALS');
          }

          logger.info('🔑 Step 9.5: Password verified successfully');
          
          // Step 10: Update customer activity
          logger.info('📋 Step 10: Updating customer activity tracking...');
        await updateCustomerLastLoginByCustomerId(customer.uuid);
          logger.info('✅ Step 10.1: Activity tracking updated');

          // Step 11: Generate tokens and create session
          logger.info('🎫 Step 11: Generating tokens and creating session...');
        const accessToken = generateToken({ uuid: customer.uuid, role: 'customer', email: customer.email, type: 'customer' });
        const { token: refreshToken, hash } = generateRefreshToken();
          const dbTimer = new PerformanceTimer('Create Session - Customer');
          await createSession({ 
            subjectId: customer.uuid, 
            subjectType: 'customer', 
            tokenHash: hash, 
            userAgent, 
            ipAddress: ip, 
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS) 
          });
          dbTimer.end();
          logDatabase('INSERT', 'sessions', undefined, undefined, 1);
        res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
          logger.info('✅ Step 11.1: Tokens generated and session created');
          
          // Log successful customer authentication
          logAuth('LOGIN', customer.uuid, username, ip || undefined, true, 'customer');
          logSecurity('SUCCESSFUL_LOGIN', 'low', { userType: 'customer' }, ip || undefined, customer.uuid);
          
          // Log performance metrics
          const loginDuration = timer.end({ username, userType: 'customer' }, 3000);
          
          logger.info('✅ Customer login successful', { type: 'AUTH_LOGIN_CUSTOMER', customerId: customer.uuid });

        return {
          success: true,
          message: 'Login successful',
          data: {
            token: accessToken,
            tokenType: 'Bearer',
            expiresIn: ACCESS_EXPIRES_IN,
            subject: { id: customer.uuid, type: 'customer', role: 'customer', email: customer.email },
          },
          timestamp: new Date().toISOString(),
        };
      }

        // Step 12: No matching user found
        logger.warn('❌ Step 12: Login failed - user not found', { type: 'AUTH_LOGIN_DENY', username });
        logger.warn(`⚠️ Step 12.1: Invalid login attempt for username: ${username}`);
        logger.warn(`📍 Step 12.2: Failed attempt from IP: ${ip}`);
        
        // Log auth failure and security event
        logAuth('LOGIN', undefined, username, ip || undefined, false, undefined, 'User not found');
        logSecurity('FAILED_LOGIN_ATTEMPT', 'medium', { reason: 'User not found', username }, ip || undefined);
        
        throw new Error('AUTH_INVALID_CREDENTIALS');
        
      } catch (error: any) {
        const errorIp = req.ip || 'unknown';
        
        // Step 13: Error handling and logging
        logger.error('💥 Login controller error', { 
          type: 'TRPC_AUTH_LOGIN_ERROR', 
          error: error?.message, 
          username: username || 'unknown',
          ip: errorIp,
          stack: error?.stack 
        });
        
        // Log security event for error
        if (error.message !== 'AUTH_INVALID_CREDENTIALS') {
          logSecurity('LOGIN_ERROR', 'high', { error: error.message }, errorIp !== 'unknown' ? errorIp : undefined, undefined, 'LOGIN');
        }
        
        // End performance timer with error
        try {
          timer.end({ error: error.message, username }, 3000);
        } catch {}
        
        // Re-throw the error for tRPC to handle
        throw error;
      }
    }),

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
  extendSession: publicProcedure
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
    }),

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
  logout: publicProcedure
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
    }),
});
