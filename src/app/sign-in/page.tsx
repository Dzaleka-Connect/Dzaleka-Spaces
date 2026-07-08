import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-1 text-muted-foreground">
          We&apos;ll email you a one-time sign-in link. No password needed.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
