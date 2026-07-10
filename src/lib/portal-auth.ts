import "server-only";

import { redirect } from "next/navigation";
import { canModerate, hasRole, isStaff } from "@/lib/auth-roles";
import { getSessionUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/session-user";

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireModerator(): Promise<SessionUser> {
  const user = await requireUser();
  if (!canModerate(user)) redirect("/account");
  if (user.assuranceLevel !== "aal2") {
    redirect("/account/security?mfa=required&returnTo=/admin");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireModerator();
  if (!hasRole(user, "admin")) redirect("/admin");
  return user;
}

export async function requireVerifier(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isStaff(user)) redirect("/account");
  if (user.assuranceLevel !== "aal2") {
    redirect("/account/security?mfa=required&returnTo=/verifier/assignments");
  }
  return user;
}
