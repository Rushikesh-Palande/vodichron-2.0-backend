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
import { checkUserExistsProcedure } from './routers/check-user-exists.router';
import { deleteUserProcedure } from './routers/delete-user.router';
import { updatePasswordProcedure } from './routers/update-password.router';
import { updateUserProcedure } from './routers/update-user.router';
import { getUserByIdProcedure } from './routers/get-user-by-id.router';
import { updateUserActivityProcedure } from './routers/update-user-activity.router';
import { createCustomerAppAccessProcedure } from './routers/create-customer-access.router';

/**
 * User Router
 * ===========
 * 
 * Exposes user-related tRPC procedures:
 * - profile: Get authenticated user's profile
 * - register: Register new application user (grant access)
 * - list: Get paginated list of application users with filters
 * - checkExists: Check if user exists by email
 * - delete: Delete user by employeeId
 * - updatePassword: Update user password with old password validation
 * - update: Update user (role, password, status)
 * - getById: Get user by employeeId
 * - updateActivity: Update user activity tracking
 * - createCustomerAccess: Create customer app access
 */
export const userRouter = router({
  profile: getProfileProcedure,
  register: registerUserProcedure,
  list: getApplicationUsersListProcedure,
  checkExists: checkUserExistsProcedure,
  delete: deleteUserProcedure,
  updatePassword: updatePasswordProcedure,
  update: updateUserProcedure,
  getById: getUserByIdProcedure,
  updateActivity: updateUserActivityProcedure,
  createCustomerAccess: createCustomerAppAccessProcedure,
});
