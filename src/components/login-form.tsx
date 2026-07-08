"use client";

import { useState, useTransition } from "react";
import { Info, Mail } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  if (!supabaseConfigured) {
    return (
      <Alert>
        <Info />
        <AlertTitle>Demo mode</AlertTitle>
        <AlertDescription>
          Accounts are disabled until a Supabase project is connected. Add
          NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to
          your .env.local to enable sign-in.
        </AlertDescription>
      </Alert>
    );
  }

  if (sent) {
    return (
      <Alert>
        <Mail />
        <AlertTitle>Check your email</AlertTitle>
        <AlertDescription>
          We sent you a sign-in link. Open it on this device to continue.
        </AlertDescription>
      </Alert>
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="login-email">Email address</FieldLabel>
          <Input
            id="login-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            disabled={isPending}
          />
        </Field>
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Mail data-icon="inline-start" />
            )}
            Send sign-in link
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
