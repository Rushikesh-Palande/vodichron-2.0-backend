/**
 * User tRPC Router
 * =================
 * 
 * Main tRPC router for user-related procedures.
 * Consolidates all user tRPC endpoints.
 */

import { router } from '../../../trpc/trpc';
import { getProfileProcedure } from './routers/profile.router';

/**
 * User Router
 * ===========
 * 
 * Exposes user-related tRPC procedures:
 * - profile: Get authenticated user's profile
 */
export const userRouter = router({
  profile: getProfileProcedure,
});
