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
import { getApplicationUsersListProcedure } from './routers/user-list.router';

/**
 * User Router
 * ===========
 * 
 * Exposes user-related tRPC procedures:
 * - profile: Get authenticated user's profile
 * - register: Register new application user (grant access)
 * - list: Get paginated list of application users with filters
 */
export const userRouter = router({
  profile: getProfileProcedure,
  register: registerUserProcedure,
  list: getApplicationUsersListProcedure,
});
