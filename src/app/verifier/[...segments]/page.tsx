import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Bell, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireVerifier } from "@/lib/portal-auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Verifier tools" };

export default async function VerifierCatchAllPage({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const user = await requireVerifier();
  const segments = (await params).segments;
  if (
    segments[0] === "assignments" &&
    segments[1] &&
    ["checklist", "evidence", "complete"].includes(segments[2] ?? "")
  )
    redirect(`/verifier/assignments/${segments[1]}`);
  if (segments[0] === "profile") redirect("/account/profile");
  if (segments[0] === "security") redirect("/account/security");
  if (segments[0] === "map") return <VerifierMap userId={user.id} />;
  if (segments[0] === "notifications") return <VerifierNotifications userId={user.id} />;
  notFound();
}

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-medium text-primary">Field verifier</p>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </header>
      {children}
    </div>
  );
}

async function VerifierMap({ userId }: { userId: string }) {
  const { data } = await (
    await createClient()
  )
    .from("verification_assignments")
    .select("id, status, due_at, listings(title, spaces(landmark, zones(name)))")
    .eq("verifier_id", userId)
    .in("status", ["assigned", "downloaded", "in_progress"])
    .order("due_at", { ascending: true });
  return (
    <Shell
      title="Assignment locations"
      description="Zone and approximate landmark for active field visits. Restricted directions remain inside each assignment."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {(data ?? []).map((item) => {
          const listingValue = item.listings as unknown as
            | {
                title?: string;
                spaces?:
                  | { landmark?: string; zones?: { name?: string } | { name?: string }[] }
                  | { landmark?: string; zones?: { name?: string } | { name?: string }[] }[];
              }
            | {
                title?: string;
                spaces?: { landmark?: string; zones?: { name?: string } | { name?: string }[] };
              }[]
            | null;
          const listing = Array.isArray(listingValue) ? listingValue[0] : listingValue;
          const spaceValue = listing?.spaces;
          const space = Array.isArray(spaceValue) ? spaceValue[0] : spaceValue;
          const zoneValue = space?.zones;
          const zone = Array.isArray(zoneValue) ? zoneValue[0] : zoneValue;
          return (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex justify-between gap-3">
                  <MapPin aria-hidden="true" />
                  <Badge variant="outline">{item.status}</Badge>
                </div>
                <CardTitle>{listing?.title ?? "Assignment"}</CardTitle>
                <CardDescription>
                  {zone?.name ?? "Zone unavailable"} · {space?.landmark ?? "Landmark unavailable"}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  variant="outline"
                  render={<Link href={`/verifier/assignments/${item.id}`} />}
                  nativeButton={false}
                >
                  Open assignment
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </Shell>
  );
}

async function VerifierNotifications({ userId }: { userId: string }) {
  const { data } = await (
    await createClient()
  )
    .from("notification_queue")
    .select("id, template_key, status, created_at")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (
    <Shell title="Notifications" description="Assignment and review notification delivery history.">
      {data?.length ? (
        <div className="flex flex-col gap-3">
          {data.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex justify-between gap-3">
                  <CardTitle className="text-base">
                    {item.template_key.replace(/[._]/g, " ")}
                  </CardTitle>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
                <CardDescription>
                  {new Date(item.created_at).toLocaleString("en-MW")}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bell />
            </EmptyMedia>
            <EmptyTitle>No verifier notifications</EmptyTitle>
            <EmptyDescription>New assignments and reviewer updates appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </Shell>
  );
}
