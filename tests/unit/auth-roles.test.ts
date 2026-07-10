import { describe, expect, it } from "vitest";
import { canModerate, getDashboardPath, hasRole, isStaff } from "@/lib/auth-roles";
import type { SessionUser } from "@/lib/session-user";

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    email: "person@example.test",
    fullName: "Test Person",
    roles: ["seeker"],
    assuranceLevel: "aal1",
    accountStatus: "active",
    ...overrides,
  };
}

describe("portal role routing", () => {
  it("routes moderators and admins to administration", () => {
    expect(getDashboardPath(user({ roles: ["moderator"] }))).toBe("/admin");
    expect(canModerate(user({ roles: ["admin"] }))).toBe(true);
  });

  it("routes field verifiers to assignments", () => {
    const verifier = user({ roles: ["field_verifier"] });
    expect(isStaff(verifier)).toBe(true);
    expect(hasRole(verifier, "field_verifier")).toBe(true);
    expect(getDashboardPath(verifier)).toBe("/verifier/assignments");
  });

  it("keeps suspended accounts in the security workflow", () => {
    expect(getDashboardPath(user({ roles: ["admin"], accountStatus: "suspended" }))).toBe(
      "/account/security"
    );
  });
});
