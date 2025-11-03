import { router } from '../../../trpc/trpc';
import { loginProcedure } from './routers/login.router';
import { extendSessionProcedure } from './routers/extend-session.router';
import { logoutProcedure } from './routers/logout.router';
import { generateResetLinkProcedure } from './routers/generate-reset-link.router';
import { validateResetLinkProcedure } from './routers/validate-reset-link.router';
import { resetPasswordProcedure } from './routers/reset-password.router';

/**
| * Vodichron HRMS Auth tRPC Router
| * ================================
| * Handles authentication operations for the Vodichron HRMS system using tRPC.
| * 
| * Features:
| * - Dual authentication path (Employee & Customer)
| * - Secure password verification with bcrypt
| * - JWT-based access tokens with short expiry (15 minutes)
| * - Refresh token rotation for extended sessions
| * - HTTP-only secure cookies for refresh tokens
| * - Session tracking with IP and User-Agent logging
| * - Employee online status management
| * - Password reset with email verification
| * - Comprehensive security logging and audit trail
| * 
| * Procedures:
| * - login: Authenticates user and creates session
| * - extendSession: Refreshes access token using refresh token
| * - logout: Terminates session and revokes refresh token
| * - generateResetLink: Generates and sends password reset email
| * - validateResetLink: Validates password reset token
| * - resetPassword: Resets user password with validated token
| */
export const authRouter = router({
  login: loginProcedure,
  extendSession: extendSessionProcedure,
  logout: logoutProcedure,
  generateResetLink: generateResetLinkProcedure,
  validateResetLink: validateResetLinkProcedure,
  resetPassword: resetPasswordProcedure,
});
