import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ViewingActions } from "@/components/viewing-actions";
import { ViewingDirectionsForm } from "@/components/viewing-detail-actions";
import { requireUser } from "@/lib/portal-auth";
import { getViewingForUser } from "@/lib/viewings";

export const metadata: Metadata = { title: "Manage viewing" };

export default async function ProviderViewingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const viewing = await getViewingForUser(id, user.id);
  if (!viewing) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{viewing.status}</Badge>
          <span className="text-sm text-muted-foreground">
            {new Date(viewing.proposedAt).toLocaleString("en-MW")}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold">{viewing.listingTitle}</h1>
        <p className="mt-1 text-muted-foreground">Viewing requested by {viewing.seekerName}.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Appointment response</CardTitle>
        </CardHeader>
        <CardContent>
          <ViewingActions enquiryId={viewing.enquiryId} viewing={viewing} role="provider" />
        </CardContent>
      </Card>
      {viewing.status === "confirmed" ? (
        <Card>
          <CardHeader>
            <CardTitle>Release meeting directions</CardTitle>
            <CardDescription>
              Directions stay private and every participant access is audited.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ViewingDirectionsForm viewingId={id} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
