import { ROLE_PERMISSIONS, type Permission } from "@/lib/constants";
import { ForbiddenError } from "@/lib/errors";
import type { MemberRole } from "@/types";

export function requirePermission(
  memberRole: MemberRole,
  permission: Permission
) {
  const permissions = ROLE_PERMISSIONS[memberRole] || [];
  if (!permissions.includes(permission)) {
    throw new ForbiddenError(
      `Insufficient permissions. Required: ${permission}`
    );
  }
}

export function hasPermission(
  memberRole: MemberRole,
  permission: Permission
): boolean {
  const permissions = ROLE_PERMISSIONS[memberRole] || [];
  return permissions.includes(permission);
}
