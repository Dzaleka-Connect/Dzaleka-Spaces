import type { Metadata } from "next";
import { AccountSecurityPanel, type SecurityFactor } from "@/components/account-security-panel";
import { isStaff } from "@/lib/auth-roles";
import { requireUser } from "@/lib/portal-auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account security" };

export default async function AccountSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await requireUser();
  const { returnTo } = await searchParams;
  const { data } = await (await createClient()).auth.mfa.listFactors();
  const initialFactors = (data?.totp ?? []) as SecurityFactor[];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-medium text-primary">Account</p>
        <h1 className="text-3xl font-bold">Security</h1>
        <p className="mt-1 text-muted-foreground">
          Manage sign-in protection, your password, and active devices.
        </p>
      </header>
      <AccountSecurityPanel
        assuranceLevel={user.assuranceLevel}
        staffAccount={isStaff(user)}
        returnTo={returnTo}
        initialFactors={initialFactors}
      />
    </div>
  );
}
