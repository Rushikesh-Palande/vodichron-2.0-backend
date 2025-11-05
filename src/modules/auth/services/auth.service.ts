import { logger } from '../../../utils/logger';
import { comparePasswords } from '../helpers/compare-passwords';
import { generateToken } from '../helpers/generate-token';
import { ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_MAX_AGE_MS } from '../constants/auth.constants';
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
 * Auth Service
 * ============
 * Business logic for login, logout, and session extension.
 *
 * Security Principles:
 * - No plaintext password logging
 * - Short-lived access tokens, rotating refresh tokens
 * - Audit logs with key identifiers only (uuid/email)
 */

/**
 * Handle Login
 * ------------
 * Validates credentials for employee or customer and issues tokens.
 */
export async function handleLogin(req: any, res: any) {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    logger.warn('⚠️ Login missing credentials', { type: 'AUTH_LOGIN_VALIDATION_FAIL' });
    return res.status(400).json({
      success: false,
      message: 'username and password are required',
      code: 'AUTH_MISSING_CREDENTIALS',
      timestamp: new Date().toISOString(),
    });
  }

    logger.info('🔐 Login attempt', { type: 'AUTH_LOGIN_ATTEMPT', username });
  const { ip, userAgent } = getClientMetadata(req.headers, req.ip);

  // Employee path
  const employee = await findEmployeeByOfficialEmail(username);
  if (employee) {
    logger.debug('👤 Employee path selected', { employeeId: employee.uuid, type: 'AUTH_LOGIN_FLOW' });
    const user = await findUserByEmployeeUuid(employee.uuid);
    if (!user || user.status !== 'ACTIVE') {
      logger.warn('❌ Login failed - inactive or missing user', { type: 'AUTH_LOGIN_DENY', reason: 'inactive_or_missing_user', employeeId: employee.uuid });
      return res.status(401).json({ error: { message: 'Incorrect email or password.' } });
    }
    const ok = await comparePasswords(password, user.password);
    if (!ok) {
      logger.warn('❌ Login failed - invalid password', { type: 'AUTH_LOGIN_DENY', userUuid: user.uuid });
      return res.status(401).json({ error: { message: 'Incorrect email or password.' } });
    }

    await updateUserLastLogin(user.uuid);
    await upsertEmployeeOnlineStatus(employee.uuid, 'ONLINE');

    const accessToken = generateToken({ uuid: user.uuid, role: user.role, email: employee.officialEmailId || undefined, type: 'employee' });
    const { token: refreshToken, hash } = generateRefreshToken();
    // Store employee.uuid as session subjectId (NOT user.uuid) to align with OnlineStatus FK
    await createSession({ subjectId: employee.uuid, subjectType: 'employee', tokenHash: hash, userAgent, ipAddress: ip, expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS) });

    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
    logger.info('✅ Employee login successful', { type: 'AUTH_LOGIN_EMPLOYEE', employeeId: employee.uuid, userUuid: user.uuid });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: accessToken,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        subject: { id: user.uuid, type: 'employee', role: user.role, email: employee.officialEmailId || null },
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Customer path
  const customer = await findCustomerByEmail(username);
  if (customer) {
    logger.debug('🏢 Customer path selected', { customerId: customer.uuid, type: 'AUTH_LOGIN_FLOW' });
    const access = await findCustomerAccessByCustomerId(customer.uuid);
    if (!access || access.status !== 'ACTIVE') {
      logger.warn('❌ Login failed - inactive or missing customer access', { type: 'AUTH_LOGIN_DENY', customerId: customer.uuid });
      return res.status(401).json({ error: { message: 'Incorrect email or password.' } });
    }
    const ok = await comparePasswords(password, access.password);
    if (!ok) {
      logger.warn('❌ Login failed - invalid customer password', { type: 'AUTH_LOGIN_DENY', customerId: customer.uuid });
      return res.status(401).json({ error: { message: 'Incorrect email or password.' } });
    }

    await updateCustomerLastLoginByCustomerId(customer.uuid);

    const accessToken = generateToken({ uuid: customer.uuid, role: 'customer', email: customer.email, type: 'customer' });
    const { token: refreshToken, hash } = generateRefreshToken();
    await createSession({ subjectId: customer.uuid, subjectType: 'customer', tokenHash: hash, userAgent, ipAddress: ip, expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS) });

    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
    logger.info('✅ Customer login successful', { type: 'AUTH_LOGIN_CUSTOMER', customerId: customer.uuid });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: accessToken,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        subject: { id: customer.uuid, type: 'customer', role: 'customer', email: customer.email },
      },
      timestamp: new Date().toISOString(),
    });
  }

  logger.warn('❌ Login failed - user not found', { type: 'AUTH_LOGIN_DENY', username });
  return res.status(401).json({
    success: false,
    message: 'Incorrect email or password.',
    code: 'AUTH_INVALID_CREDENTIALS',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle Extend Session
 * ---------------------
 * Rotates refresh token and issues a new access token.
 */
export async function handleExtendSession(req: any, res: any) {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  if (!refreshToken) {
    logger.warn('⚠️ Extend session missing refresh token', { type: 'AUTH_EXTEND_VALIDATION_FAIL' });
    return res.status(401).json({
      success: false,
      message: 'Missing refresh token',
      code: 'AUTH_REFRESH_MISSING',
      timestamp: new Date().toISOString(),
    });
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const session = await findSessionByTokenHash(tokenHash);
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    logger.warn('⚠️ Invalid or expired refresh token', { type: 'AUTH_EXTEND_DENY' });
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      code: 'AUTH_REFRESH_INVALID',
      timestamp: new Date().toISOString(),
    });
  }

  // Rebuild payload
  if (session.subjectType === 'employee') {
    logger.debug('🔁 Extending employee session', { subjectId: session.subjectId, type: 'AUTH_EXTEND_FLOW' });
    // session.subjectId is employee.uuid; fetch user by employee uuid
    const user = await findUserByEmployeeUuid(session.subjectId);
    const accessToken = generateToken({ uuid: user?.uuid || session.subjectId, role: (user?.role as any) || 'employee', type: 'employee' });
    const { token: newRefresh, hash } = generateRefreshToken();
    const newExpiry = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
    await updateSessionToken(tokenHash, hash, newExpiry);
    res.cookie('refreshToken', newRefresh, getRefreshCookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
    logger.info('✅ Session extended (employee)', { type: 'AUTH_EXTEND_SUCCESS', subjectId: session.subjectId });
    return res.status(200).json({
      success: true,
      message: 'Session extended',
      data: { token: accessToken, tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      timestamp: new Date().toISOString(),
    });
  } else {
    logger.debug('🔁 Extending customer session', { subjectId: session.subjectId, type: 'AUTH_EXTEND_FLOW' });
    const accessToken = generateToken({ uuid: session.subjectId, role: 'customer', type: 'customer' });
    const { token: newRefresh, hash } = generateRefreshToken();
    const newExpiry = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
    await updateSessionToken(tokenHash, hash, newExpiry);
    res.cookie('refreshToken', newRefresh, getRefreshCookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
    logger.info('✅ Session extended (customer)', { type: 'AUTH_EXTEND_SUCCESS', subjectId: session.subjectId });
    return res.status(200).json({
      success: true,
      message: 'Session extended',
      data: { token: accessToken, tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle Logout
 * -------------
 * Revokes refresh session, clears cookie, updates audit fields.
 */
export async function handleLogout(req: any, res: any) {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  if (refreshToken) {
    const tokenHash = hashRefreshToken(refreshToken);
    const session = await findSessionByTokenHash(tokenHash);
    if (session && !session.revokedAt) {
      await revokeSessionByTokenHash(tokenHash);
      if (session.subjectType === 'employee') {
        // Update lastLogin for user linked to this employee and set offline for employee
        const user = await findUserByEmployeeUuid(session.subjectId);
        if (user?.uuid) {
          await updateUserLastLogin(user.uuid);
        }
        await upsertEmployeeOnlineStatus(session.subjectId, 'OFFLINE');
      } else {
        await updateCustomerLastLoginByCustomerId(session.subjectId);
      }
    } else {
      logger.debug('ℹ️ Logout with missing/expired session', { type: 'AUTH_LOGOUT_NOOP' });
    }
  } else {
    logger.debug('ℹ️ Logout without refresh token', { type: 'AUTH_LOGOUT_NO_TOKEN' });
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  return res.status(200).json({
    success: true,
    message: 'Logout successful',
    data: { cleared: true },
    timestamp: new Date().toISOString(),
  });
}
