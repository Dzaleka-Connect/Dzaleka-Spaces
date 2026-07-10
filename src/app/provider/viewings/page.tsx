import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listViewingsForUser } from "@/lib/viewings";

export const metadata: Metadata = {
  title: "Viewings calendar",
};

export default async function ProviderViewingsPage() {
  if (!isSupabaseConfigured()) redirect("/provider");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const viewings = await listViewingsForUser(user.id, "provider");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Viewings</h1>
          <p className="mt-1 text-muted-foreground">
            Confirm times and share directions after confirmation.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/provider" />} nativeButton={false}>
          Dashboard
        </Button>
      </div>

      {viewings.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Calendar />
            </EmptyMedia>
            <EmptyTitle>No viewings scheduled</EmptyTitle>
            <EmptyDescription>
              Viewing requests appear here when seekers ask from an enquiry thread.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {viewings.map((v) => (
            <Card key={v.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {v.listingTitle} · {v.seekerName}
                  </CardTitle>
                  <Badge variant="outline">{v.status}</Badge>
                </div>
                <CardDescription>{new Date(v.proposedAt).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/provider/viewings/${v.id}`} />}
                  nativeButton={false}
                >
                  Manage viewing
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
