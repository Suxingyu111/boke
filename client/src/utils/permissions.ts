import type { AuthUser, UserRole } from "@/types/blog";

type RoleLike = Pick<AuthUser, "role"> | null | undefined;

const ROLE_WEIGHTS: Record<UserRole, number> = {
  user: 1,
  author: 2,
  admin: 3,
  super_admin: 4,
};

export function getRoleWeight(role?: UserRole | null) {
  if (!role) {
    return 0;
  }

  return ROLE_WEIGHTS[role] ?? 0;
}

export function hasMinimumRole(
  roleOrUser: UserRole | RoleLike,
  minimumRole: UserRole,
) {
  const role =
    typeof roleOrUser === "string" ? roleOrUser : roleOrUser?.role ?? null;
  return getRoleWeight(role) >= getRoleWeight(minimumRole);
}

export function resolveMinimumRole(roles: Array<UserRole | undefined>) {
  return roles.reduce<UserRole | undefined>((highest, current) => {
    if (!current) {
      return highest;
    }

    if (!highest || getRoleWeight(current) > getRoleWeight(highest)) {
      return current;
    }

    return highest;
  }, undefined);
}

export function canAccessManagement(user?: RoleLike) {
  return hasMinimumRole(user, "author");
}

export function canAccessAdminFeatures(user?: RoleLike) {
  return hasMinimumRole(user, "admin");
}

export function getDefaultAuthorizedRoute(user?: RoleLike) {
  if (canAccessAdminFeatures(user)) {
    return "/admin";
  }

  if (canAccessManagement(user)) {
    return "/admin/articles";
  }

  return "/";
}
