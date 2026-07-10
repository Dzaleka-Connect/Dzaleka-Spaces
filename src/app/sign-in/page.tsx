import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="mt-1 text-muted-foreground">
          Use your email and password, or request a one-time magic link.
        </p>
      </div>
      <LoginForm mode="sign-in" />
      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium hover:underline">
          Create an account
        </Link>
        .
      </p>
    </div>
  );
}
