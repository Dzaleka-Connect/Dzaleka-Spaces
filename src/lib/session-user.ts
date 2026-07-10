export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  roles: string[];
  assuranceLevel: "aal1" | "aal2";
  accountStatus: "active" | "restricted" | "suspended" | "closed";
}
