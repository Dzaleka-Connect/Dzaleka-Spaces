import type { SessionUser } from "./session-user";

export function isStaff(user: SessionUser | null): boolean {
  return Boolean(user?.roles.some((r) => ["moderator", "admin", "field_verifier"].includes(r)));
}

export function hasRole(user: SessionUser | null, role: string): boolean {
  return Boolean(user?.roles.includes(role));
}

export function canModerate(user: SessionUser | null): boolean {
  return Boolean(user?.roles.some((role) => role === "admin" || role === "moderator"));
}

/** Post-login / brand-home destination for a signed-in user. */
export function getDashboardPath(user: SessionUser): string {
  if (user.accountStatus === "suspended" || user.accountStatus === "closed") {
    return "/account/security";
  }
  if (canModerate(user)) return "/admin";
  if (hasRole(user, "field_verifier")) return "/verifier/assignments";
  return "/account";
}
