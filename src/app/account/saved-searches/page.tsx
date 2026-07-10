import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { listSavedSearches } from "@/lib/saved-searches";
import { criteriaToSearchParams } from "@/lib/saved-searches";
import { featureEnabled } from "@/lib/features";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Bookmark } from "lucide-react";
import { deleteSavedSearch } from "./actions";

export const metadata: Metadata = {
  title: "Saved searches",
};

export default async function SavedSearchesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Saved searches are available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const status = await searchParams;
  const [searches, alertsEnabled] = await Promise.all([
    listSavedSearches(user.id),
    featureEnabled("saved_search_alerts"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Saved searches</h1>
          <p className="mt-1 text-muted-foreground">Named filter sets with alert preferences.</p>
        </div>
        <Button variant="outline" render={<Link href="/account" />} nativeButton={false}>
          Account
        </Button>
      </div>

      {!alertsEnabled ? (
        <Alert>
          <Info />
          <AlertTitle>Alerts paused</AlertTitle>
          <AlertDescription>
            The saved_search_alerts feature flag is off. Searches are saved but notifications will
            not be sent until an admin enables the flag.
          </AlertDescription>
        </Alert>
      ) : null}

      {status.deleted ? (
        <Alert>
          <AlertTitle>Search deleted</AlertTitle>
        </Alert>
      ) : null}

      {searches.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bookmark />
            </EmptyMedia>
            <EmptyTitle>No saved searches</EmptyTitle>
            <EmptyDescription>
              Browse spaces, apply filters, then use Save search on the browse page.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {searches.map((search) => {
            const params = criteriaToSearchParams(search.criteria);
            return (
              <Card key={search.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{search.name}</CardTitle>
                    <div className="flex gap-1.5">
                      <Badge variant="outline">{search.channel}</Badge>
                      <Badge variant="outline">{search.frequency}</Badge>
                      {search.paused ? <Badge variant="secondary">Paused</Badge> : null}
                    </div>
                  </div>
                  <CardDescription>
                    Saved {new Date(search.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/spaces?${params.toString()}`} />}
                    nativeButton={false}
                  >
                    Run search
                  </Button>
                  <form action={deleteSavedSearch.bind(null, search.id)}>
                    <Button variant="ghost" size="sm" type="submit">
                      Delete
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
