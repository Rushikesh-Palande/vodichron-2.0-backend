import { publicProcedure } from '../../../../trpc/trpc';
import { 
  logger, 
  logAuth, 
  logSecurity, 
  logPerformance, 
  logDatabase,
  PerformanceTimer 
} from '../../../../utils/logger';
import { loginSchema } from '../../schemas/auth.schemas';
import { 
  ACCESS_TOKEN_EXPIRES_IN, 
  REFRESH_TOKEN_MAX_AGE_MS 
} from '../../constants/auth.constants';
import { comparePasswords } from '../../helpers/compare-passwords';
import { generateToken } from '../../helpers/generate-token';
import { generateRefreshToken } from '../../helpers/generate-refresh-token';
import { getClientMetadata } from '../../helpers/get-client-metadata';
import { getRefreshCookieOptions } from '../../helpers/get-cookie-options';
import {
  findCustomerAccessByCustomerId,
  findCustomerByEmail,
  findEmployeeByOfficialEmail,
  findUserByEmployeeUuid,
  updateCustomerLastLoginByCustomerId,
  updateUserLastLogin,
  upsertEmployeeOnlineStatus,
  createSession,
} from '../../store/auth.store';

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
export const loginProcedure = publicProcedure
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
            subject: { id: user.uuid, type: 'employee', role: user.role, email: employee.officialEmailId || null, employeeId: employee.employeeId || null },
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
            subject: { id: customer.uuid, type: 'customer', role: 'customer', email: customer.email, customerId: customer.uuid },
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
  });
