import type { Metadata } from "next";
import Link from "next/link";
import { PasswordRecoveryRequestForm } from "@/components/password-recovery-form";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <header>
        <h1 className="text-3xl font-bold">Reset your password</h1>
        <p className="mt-1 text-muted-foreground">
          We will send a time-limited reset link to your account email.
        </p>
      </header>
      <PasswordRecoveryRequestForm />
      <Link href="/sign-in" className="text-sm font-medium text-primary hover:underline">
        Return to sign in
      </Link>
    </div>
  );
}
