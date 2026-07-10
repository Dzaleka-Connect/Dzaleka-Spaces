"use client";

import { useState, useTransition } from "react";
import { Mail, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecoveryRequestForm() {
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    startTransition(async () => {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) toast.error(error.message);
      else setSent(true);
    });
  }

  if (sent) {
    return (
      <Alert>
        <Mail />
        <AlertTitle>Check your email</AlertTitle>
        <AlertDescription>
          If an account exists for that address, a password reset link has been sent.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="recovery-email">Email address</FieldLabel>
          <Input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
          />
        </Field>
        <Field>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : <Mail data-icon="inline-start" />}
            Send reset link
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

export function PasswordResetForm() {
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    startTransition(async () => {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) toast.error(error.message);
      else {
        toast.success("Password updated.");
        window.location.assign("/account/security");
      }
    });
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reset-password">New password</FieldLabel>
          <Input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            disabled={isPending}
          />
        </Field>
        <Field>
          <Button type="submit" className="w-full" disabled={isPending}>
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
  );
}
