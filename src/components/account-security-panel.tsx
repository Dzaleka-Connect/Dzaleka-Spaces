"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { KeyRound, Laptop, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

export type SecurityFactor = {
  id: string;
  friendly_name?: string;
  status: "verified" | "unverified";
  created_at: string;
};

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function AccountSecurityPanel({
  assuranceLevel,
  staffAccount,
  returnTo,
  initialFactors,
}: {
  assuranceLevel: "aal1" | "aal2";
  staffAccount: boolean;
  returnTo?: string;
  initialFactors: SecurityFactor[];
}) {
  const [factors, setFactors] = useState<SecurityFactor[]>(initialFactors);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [isPending, startTransition] = useTransition();

  async function loadFactors() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error("Could not load security factors.");
    } else {
      setFactors((data?.totp ?? []) as SecurityFactor[]);
    }
  }

  function enroll() {
    startTransition(async () => {
      const supabase = createClient();
      for (const factor of factors.filter((item) => item.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Dzaleka Spaces",
        issuer: "Dzaleka Spaces",
      });
      if (error || !data) {
        toast.error(error?.message ?? "Could not start authenticator setup.");
        return;
      }
      const rawQr = data.totp.qr_code;
      setEnrollment({
        factorId: data.id,
        qrCode: rawQr.startsWith("data:")
          ? rawQr
          : `data:image/svg+xml;utf8,${encodeURIComponent(rawQr)}`,
        secret: data.totp.secret,
      });
    });
  }

  function verify(event: React.FormEvent<HTMLFormElement>, factorId: string) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Authenticator verified.");
      await supabase.auth.refreshSession();
      window.location.assign(returnTo?.startsWith("/") ? returnTo : "/account/security");
    });
  }

  function removeFactor(factorId: string) {
    startTransition(async () => {
      const { error } = await createClient().auth.mfa.unenroll({ factorId });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Authenticator removed.");
      await loadFactors();
    });
  }

  const verified = factors.find((factor) => factor.status === "verified");

  return (
    <div className="flex flex-col gap-6">
      {staffAccount && assuranceLevel !== "aal2" ? (
        <Alert variant="destructive">
          <ShieldCheck />
          <AlertTitle>Second factor required</AlertTitle>
          <AlertDescription>
            Staff access is paused until this session is verified with an authenticator app.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Authenticator app</CardTitle>
          <CardDescription>
            Use a time-based code from an authenticator app. Staff accounts must complete this step
            before opening operational records.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {verified ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border p-4">
                <div className="flex items-center gap-3">
                  <Smartphone aria-hidden="true" />
                  <div>
                    <p className="font-medium">{verified.friendly_name || "Authenticator app"}</p>
                    <p className="text-sm text-muted-foreground">
                      Added {new Date(verified.created_at).toLocaleDateString("en-MW")}
                    </p>
                  </div>
                </div>
                <Badge variant={assuranceLevel === "aal2" ? "default" : "secondary"}>
                  {assuranceLevel === "aal2" ? "Session verified" : "Code required"}
                </Badge>
              </div>

              {assuranceLevel !== "aal2" ? (
                <form onSubmit={(event) => verify(event, verified.id)}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="existing-mfa-code">Six-digit code</FieldLabel>
                      <Input
                        id="existing-mfa-code"
                        name="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        required
                        disabled={isPending}
                      />
                    </Field>
                    <Field orientation="horizontal">
                      <Button type="submit" disabled={isPending}>
                        {isPending ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <ShieldCheck data-icon="inline-start" />
                        )}
                        Verify this session
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => removeFactor(verified.id)}
                  disabled={isPending}
                >
                  Remove authenticator
                </Button>
              )}
            </div>
          ) : enrollment ? (
            <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
              <Image
                src={enrollment.qrCode}
                alt="Authenticator setup QR code"
                width={192}
                height={192}
                unoptimized
                className="border bg-white p-2"
              />
              <form onSubmit={(event) => verify(event, enrollment.factorId)}>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Manual setup key</FieldLabel>
                    <Input
                      value={enrollment.secret}
                      readOnly
                      aria-label="Manual authenticator setup key"
                    />
                    <FieldDescription>
                      Keep this key private. Enter it only if your authenticator cannot scan the
                      code.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="new-mfa-code">Six-digit code</FieldLabel>
                    <Input
                      id="new-mfa-code"
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      required
                      disabled={isPending}
                    />
                  </Field>
                  <Field orientation="horizontal">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <ShieldCheck data-icon="inline-start" />
                      )}
                      Finish setup
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            </div>
          ) : (
            <Button onClick={enroll} disabled={isPending}>
              {isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Smartphone data-icon="inline-start" />
              )}
              Set up authenticator
            </Button>
          )}
        </CardContent>
      </Card>

      <PasswordPanel />
      <SessionActions />
    </div>
  );
}

function PasswordPanel() {
  const [isPending, startTransition] = useTransition();

  function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    startTransition(async () => {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) toast.error(error.message);
      else toast.success("Password updated.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Changing your password does not affect email magic-link sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={updatePassword}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <Input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                disabled={isPending}
              />
              <FieldDescription>
                Use at least 10 characters and do not reuse a password from another service.
              </FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <KeyRound data-icon="inline-start" />
                )}
                Update password
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function SessionActions() {
  const [isPending, startTransition] = useTransition();

  function signOut(scope: "others" | "global") {
    startTransition(async () => {
      const { error } = await createClient().auth.signOut({ scope });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (scope === "global") window.location.assign("/sign-in");
      else toast.success("Other sessions signed out.");
    });
  }

  return (
    <Card id="signed-in-devices">
      <CardHeader>
        <CardTitle>Signed-in devices</CardTitle>
        <CardDescription>
          Revoke refresh tokens when a shared or lost device may still be signed in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => signOut("others")} disabled={isPending}>
          <Laptop data-icon="inline-start" /> Sign out other devices
        </Button>
        <Button variant="destructive" onClick={() => signOut("global")} disabled={isPending}>
          <LogOut data-icon="inline-start" /> Sign out everywhere
        </Button>
      </CardContent>
    </Card>
  );
}
