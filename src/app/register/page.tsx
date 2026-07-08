import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Create an account",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Create an account
        </h1>
        <p className="mt-1 text-muted-foreground">
          Enter your email and we&apos;ll send you a one-time link — it creates
          your account the first time you use it. No password to remember.
        </p>
      </div>
      <LoginForm />
      <p className="text-sm text-muted-foreground">
        Accounts let you save spaces, follow searches, message providers and
        keep occupancy records. Searching and browsing never require an
        account. Already registered?{" "}
        <Link href="/sign-in" className="font-medium hover:underline">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
