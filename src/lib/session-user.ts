export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  roles: string[];
}
