import type { Role } from '@/lib/enums'

/**
 * Only an OWNER may assign the OWNER role. Prevents an Admin (who holds
 * `users.manage`) from creating or promoting an account to Owner-level power.
 */
export const canAssignRole = (actorRole: Role, newRole: Role): boolean =>
  newRole !== 'OWNER' || actorRole === 'OWNER'

/**
 * Only an OWNER may modify an existing OWNER account (edit or reset password).
 * Prevents Owner account takeover by an Admin.
 */
export const canModifyUser = (actorRole: Role, targetRole: Role): boolean =>
  targetRole !== 'OWNER' || actorRole === 'OWNER'
