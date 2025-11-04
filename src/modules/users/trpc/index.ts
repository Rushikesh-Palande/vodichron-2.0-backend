/**
 * User tRPC Router
 * =================
 * 
 * Main tRPC router for user-related procedures.
 * Consolidates all user tRPC endpoints.
 */

import { router } from '../../../trpc/trpc';
import { getProfileProcedure } from './routers/profile.router';
import { registerUserProcedure } from './routers/register.router';

/**
 * User Router
 * ===========
 * 
 * Exposes user-related tRPC procedures:
 * - profile: Get authenticated user's profile
 * - register: Register new application user (grant access)
 */
export const userRouter = router({
  profile: getProfileProcedure,
  register: registerUserProcedure,
});
