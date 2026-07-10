import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Info, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getSessionUser } from "@/lib/auth";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { inviteProviderTeamMember } from "./actions";

export const metadata: Metadata = {
  title: "Provider team",
};

const PERMISSIONS = [
  ["manage_spaces", "Manage spaces"],
  ["manage_listings", "Manage listings"],
  ["respond_enquiries", "Respond to enquiries"],
  ["manage_viewings", "Manage viewings"],
  ["manage_occupancies", "Manage occupancies"],
  ["record_payments", "Record payments"],
  ["manage_maintenance", "Manage maintenance"],
  ["view_reports", "View reports"],
  ["full_manager", "Full manager"],
];

export default async function ProviderTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  type TeamMember = {
    id: string;
    member_id: string;
    permissions: string[];
    status: string;
    profiles?:
      | { full_name: string | null; email: string | null }
      | { full_name: string | null; email: string | null }[]
      | null;
  };
  let members: TeamMember[] = [];

  if (isSupabaseConfigured() && isSupabaseAdminConfigured()) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("provider_team_members")
      .select(
        "id, member_id, permissions, status, profiles!provider_team_members_member_id_fkey(full_name, email)"
      )
      .eq("provider_id", user.id)
      .order("invited_at", { ascending: false });
    members = (data ?? []) as unknown as TeamMember[];
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Provider team</h1>
        <p className="mt-1 text-muted-foreground">
          Grant scoped access to people helping manage your spaces. Permissions are enforced by the
          database helper used by provider workflows.
        </p>
      </div>

      {params.error ? (
        <Alert variant="destructive">
          <Info />
          <AlertTitle>Team update failed</AlertTitle>
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}
      {params.saved ? (
        <Alert>
          <Users />
          <AlertTitle>Team member saved</AlertTitle>
          <AlertDescription>The provider team permissions were updated.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Team members</CardTitle>
            <CardDescription>
              Active members can use only the capabilities granted here.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members have been added.</p>
            ) : (
              members.map((member) => (
                <div key={member.id} className="flex flex-col gap-2 rounded-lg border p-3">
                  {(() => {
                    const profile = Array.isArray(member.profiles)
                      ? member.profiles[0]
                      : member.profiles;
                    return (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">
                            {profile?.full_name || profile?.email || member.member_id}
                          </p>
                          <Badge variant="outline">{member.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {member.permissions.map((permission) => (
                            <Badge key={permission} variant="secondary">
                              {permission.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add team member</CardTitle>
            <CardDescription>
              The user must have signed in once so their profile exists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={inviteProviderTeamMember}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" name="email" type="email" required />
                </Field>
                <Field>
                  <FieldLabel>Permissions</FieldLabel>
                  <div className="flex flex-col gap-2">
                    {PERMISSIONS.map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 text-sm">
                        <Checkbox name="permissions" value={value} />
                        {label}
                      </label>
                    ))}
                  </div>
                </Field>
                <Button type="submit">Save team member</Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
