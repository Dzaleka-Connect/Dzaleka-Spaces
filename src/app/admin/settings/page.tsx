import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Flag,
  Info,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { canModerate, getSessionUser, hasRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Admin settings",
};

const SETTINGS = [
  {
    title: "Feature flags",
    description: "Enable safe pilot features and keep locked flags disabled.",
    href: "/admin/flags",
    icon: Flag,
  },
  {
    title: "Roles",
    description: "Grant staff, verifier, finance and service roles.",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Content",
    description: "Review database-managed help and policy pages.",
    href: "/admin/content/pages",
    icon: SlidersHorizontal,
  },
  {
    title: "Notifications",
    description: "Review templates, outbox state and failed deliveries.",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    title: "Audit",
    description: "Inspect sensitive access and operational decisions.",
    href: "/admin/audit",
    icon: ShieldCheck,
  },
];

export default async function AdminSettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Settings are available once Supabase is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Administrative settings and operational controls.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SETTINGS.map((item) => {
          const Icon = item.icon;
          const disabled =
            (item.href === "/admin/flags" || item.href === "/admin/users") &&
            !hasRole(user, "admin");
          return (
            <Card key={item.href}>
              <CardHeader>
                <Icon />
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  render={<Link href={item.href} />}
                  nativeButton={false}
                  disabled={disabled}
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
