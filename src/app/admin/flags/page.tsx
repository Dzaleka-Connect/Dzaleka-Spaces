import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Info, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canModerate, getSessionUser, hasRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateFeatureFlag } from "../actions";
import { getFeatureFlags } from "../data";
import { isLockedPilotFlag, lockedFlagReason } from "../flag-policy";

export const metadata: Metadata = {
  title: "Feature flags",
};

export default async function AdminFlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Feature flags are available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");

  const canManage = hasRole(user, "admin");
  const flags = await getFeatureFlags();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature flags</h1>
          <p className="mt-1 text-muted-foreground">
            Operational gates for pilot features. Locked flags cannot be
            enabled from the app.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/admin" />}
          nativeButton={false}
        >
          Admin overview
        </Button>
      </div>

      {!canManage ? (
        <Alert>
          <Lock />
          <AlertTitle>Read-only access</AlertTitle>
          <AlertDescription>
            Moderators can inspect flags. Only admins can change safe feature
            flags.
          </AlertDescription>
        </Alert>
      ) : null}
      {params.error ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Could not update flag</AlertTitle>
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}
      {params.updated ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Flag updated</AlertTitle>
          <AlertDescription>The feature flag change was recorded.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Flags</CardTitle>
          <CardDescription>
            Payment processing and residential listings remain off during the
            pilot unless the operating constraints change outside the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((flag) => {
                const locked = isLockedPilotFlag(flag.name);
                const action = updateFeatureFlag.bind(null, flag.name);

                return (
                  <TableRow key={flag.name}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{flag.name}</span>
                        {flag.description ? (
                          <span className="text-xs font-normal text-muted-foreground">
                            {flag.description}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={flag.enabled ? "default" : "outline"}>
                        {flag.enabled ? "enabled" : "disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-sm whitespace-normal text-sm text-muted-foreground">
                      {locked ? lockedFlagReason(flag.name) : "Admin-managed"}
                    </TableCell>
                    <TableCell>
                      <form action={action} className="flex items-center gap-2">
                        <input type="hidden" name="enabled" value="off" />
                        <Field orientation="horizontal">
                          <Checkbox
                            id={`flag-${flag.name}`}
                            name="enabled"
                            value="on"
                            defaultChecked={flag.enabled}
                            disabled={!canManage || locked}
                          />
                          <FieldLabel htmlFor={`flag-${flag.name}`}>
                            Enabled
                          </FieldLabel>
                        </Field>
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={!canManage || locked}
                        >
                          Save
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
