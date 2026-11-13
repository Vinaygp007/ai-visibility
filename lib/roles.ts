// Client-safe role helpers (no "server-only" import) so both server gates and
// client components check roles the same way.
//
// super_admin is a strict superset of admin: every place that admits an admin
// must also admit a super admin, which is why callers should use isAdminRole()
// rather than comparing against the "admin" string directly.
export type UserRole = "user" | "admin" | "super_admin";

export const ROLES: UserRole[] = ["user", "admin", "super_admin"];

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "super_admin";
}

export const ROLE_LABEL: Record<UserRole, string> = {
  user: "User",
  admin: "Admin",
  super_admin: "Super admin",
};
