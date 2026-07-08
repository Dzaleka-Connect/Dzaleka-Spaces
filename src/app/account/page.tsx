import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Info, LogOut, MessageSquare } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSessionUser, hasRole, isStaff } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account",
};

export default async function AccountPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Accounts are disabled until a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data: enquiries } = await supabase
    .from("enquiries")
    .select("id, listing_id, message, channel, created_at")
    .eq("seeker_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const listingIds = [...new Set((enquiries ?? []).map((e) => e.listing_id))];
  const { data: listingTitles } = listingIds.length
    ? await supabase
        .from("public_listings")
        .select("id, title")
        .in("id", listingIds)
    : { data: [] };
  const titleById = new Map(
    (listingTitles ?? []).map((l) => [l.id, l.title as string])
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {user.fullName || "Your account"}
          </h1>
          <p className="mt-1 text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {user.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <Button variant="outline" type="submit">
            <LogOut data-icon="inline-start" />
            Sign out
          </Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Saved spaces</CardTitle>
            <CardDescription>
              Compare spaces you want to review again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/account/saved-spaces" />}
              nativeButton={false}
            >
              <Heart data-icon="inline-start" />
              Open saved spaces
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Provider tools</CardTitle>
            <CardDescription>
              Manage the spaces and listings you offer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/provider" />}
              nativeButton={false}
            >
              Open provider dashboard
            </Button>
          </CardContent>
        </Card>
        {isStaff(user) ? (
          <Card>
            <CardHeader>
              <CardTitle>Field verification</CardTitle>
              <CardDescription>
                Assignments awaiting an in-person visit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/verifier/assignments" />}
                nativeButton={false}
              >
                Open assignments
              </Button>
            </CardContent>
          </Card>
        ) : null}
        {hasRole(user, "admin") || hasRole(user, "moderator") ? (
          <Card>
            <CardHeader>
              <CardTitle>Administration</CardTitle>
              <CardDescription>
                Review queue, metrics and feature flags.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/admin" />}
                nativeButton={false}
              >
                Open admin portal
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your enquiries</CardTitle>
          <CardDescription>
            Enquiries you sent while signed in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(enquiries ?? []).length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageSquare />
                </EmptyMedia>
                <EmptyTitle>No enquiries yet</EmptyTitle>
                <EmptyDescription>
                  Browse spaces and send an enquiry — it will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {(enquiries ?? []).map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-1 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/spaces/${e.listing_id}`}
                      className="font-medium hover:underline"
                    >
                      {titleById.get(e.listing_id) ?? "Listing"}
                    </Link>
                    <Badge variant="outline">{e.channel}</Badge>
                  </div>
                  {e.message ? (
                    <p className="text-sm text-muted-foreground">
                      {e.message}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {(enquiries ?? []).length > 0 ? (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/account/enquiries" />}
                nativeButton={false}
              >
                <MessageSquare data-icon="inline-start" />
                View all enquiries
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
