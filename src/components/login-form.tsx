"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Info, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

type LoginFormProps = {
  mode?: "sign-in" | "register";
};

export function LoginForm({ mode = "sign-in" }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [registerSent, setRegisterSent] = useState(false);

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

  if (magicLinkSent) {
    return (
      <Alert>
        <Mail />
        <AlertTitle>Check your email</AlertTitle>
        <AlertDescription>
          We sent you a one-time sign-in link. Open it on this device to
          continue.
        </AlertDescription>
      </Alert>
    );
  }

  if (registerSent) {
    return (
      <Alert>
        <Mail />
        <AlertTitle>Confirm your email</AlertTitle>
        <AlertDescription>
          If email confirmation is enabled for this project, check your inbox
          for a confirmation link. Otherwise you can{" "}
          <Link href="/sign-in" className="font-medium underline">
            sign in
          </Link>{" "}
          with your email and password.
        </AlertDescription>
      </Alert>
    );
  }

  function onPasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "").trim();

    startTransition(async () => {
      const supabase = createClient();

      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: fullName ? { full_name: fullName } : undefined,
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        setRegisterSent(true);
        toast.success("Account created");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Signed in");
      router.push("/");
      router.refresh();
    });
  }

  function onMagicLinkSubmit(event: React.FormEvent<HTMLFormElement>) {
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
        setMagicLinkSent(true);
      }
    });
  }

  if (mode === "register") {
    return (
      <form onSubmit={onPasswordSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="register-name">Full name</FieldLabel>
            <Input
              id="register-name"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              disabled={isPending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="register-email">Email address</FieldLabel>
            <Input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              disabled={isPending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="register-password">Password</FieldLabel>
            <Input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
              required
              disabled={isPending}
            />
            <FieldDescription>
              Use a password you can remember, or sign in later with a magic
              link instead.
            </FieldDescription>
          </Field>
          <Field>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <KeyRound data-icon="inline-start" />
              )}
              Create account
            </Button>
          </Field>
        </FieldGroup>
      </form>
    );
  }

  return (
    <Tabs defaultValue="password">
      <TabsList className="w-full">
        <TabsTrigger value="password" className="flex-1">
          Email & password
        </TabsTrigger>
        <TabsTrigger value="magic-link" className="flex-1">
          Magic link
        </TabsTrigger>
      </TabsList>

      <TabsContent value="password" className="mt-4">
        <form onSubmit={onPasswordSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="login-email">Email address</FieldLabel>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                disabled={isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isPending}
              />
            </Field>
            <Field>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <KeyRound data-icon="inline-start" />
                )}
                Sign in
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </TabsContent>

      <TabsContent value="magic-link" className="mt-4">
        <form onSubmit={onMagicLinkSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="magic-email">Email address</FieldLabel>
              <Input
                id="magic-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                disabled={isPending}
              />
              <FieldDescription>
                We&apos;ll email a one-time link. No password needed.
              </FieldDescription>
            </Field>
            <Field>
              <Button type="submit" disabled={isPending} className="w-full">
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
      </TabsContent>
    </Tabs>
  );
}
