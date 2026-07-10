import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleManager } from "@/components/role-manager";
import { canModerate, getSessionUser, hasRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Users",
};

export default async function AdminUsersPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            User administration is available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");

  const isAdmin = hasRole(user, "admin");
  const supabase = await createClient();

  const [{ data: profiles }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, whatsapp, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  const rolesByUser = new Map<string, string[]>();
  for (const row of roleRows ?? []) {
    const list = rolesByUser.get(row.user_id) ?? [];
    list.push(row.role);
    rolesByUser.set(row.user_id, list);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="mt-1 text-muted-foreground">
          {profiles?.length ?? 0} registered user
          {(profiles?.length ?? 0) === 1 ? "" : "s"}.{" "}
          {isAdmin
            ? "Grant or revoke roles below — every change is audited."
            : "Role changes require the admin role."}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Roles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(profiles ?? []).map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">
                {p.full_name || "—"}
                {p.id === user.id ? (
                  <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                ) : null}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {p.whatsapp || p.phone || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <RoleManager userId={p.id} roles={rolesByUser.get(p.id) ?? []} canEdit={isAdmin} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
