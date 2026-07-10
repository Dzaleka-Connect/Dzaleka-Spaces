import type { Metadata } from "next";
import { PasswordResetForm } from "@/components/password-recovery-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <header>
        <h1 className="text-3xl font-bold">Choose a new password</h1>
        <p className="mt-1 text-muted-foreground">
          Use a unique password with at least 10 characters.
        </p>
      </header>
      <PasswordResetForm />
    </div>
  );
}
