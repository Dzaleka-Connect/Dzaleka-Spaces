import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, MapPin, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ViewingActions } from "@/components/viewing-actions";
import { ViewingSafetyActions } from "@/components/viewing-detail-actions";
import { requireUser } from "@/lib/portal-auth";
import { getViewingForUser, getViewingPrivateDetails } from "@/lib/viewings";

export const metadata: Metadata = { title: "Viewing details" };

export default async function AccountViewingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const viewing = await getViewingForUser(id, user.id);
  if (!viewing) notFound();
  const privateDetails = viewing.status === "confirmed" ? await getViewingPrivateDetails(id) : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{viewing.status}</Badge>
          <span className="text-sm text-muted-foreground">
            {new Date(viewing.proposedAt).toLocaleString("en-MW")}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold">{viewing.listingTitle}</h1>
        <p className="mt-1 text-muted-foreground">Viewing appointment and safety controls.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          render={<Link href={`/api/viewings/${id}/calendar`} />}
          nativeButton={false}
        >
          <CalendarPlus data-icon="inline-start" />
          Add to calendar
        </Button>
        <Button
          variant="outline"
          render={<Link href={`/account/enquiries/${viewing.enquiryId}`} />}
          nativeButton={false}
        >
          Open enquiry
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Appointment</CardTitle>
          <CardDescription>
            Changes and cancellations are recorded in the enquiry workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ViewingActions enquiryId={viewing.enquiryId} viewing={viewing} role="seeker" />
        </CardContent>
      </Card>
      {privateDetails ? (
        <Card>
          <CardHeader>
            <CardTitle>Private meeting directions</CardTitle>
            <CardDescription>Released after both parties confirmed the viewing.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="flex gap-2">
              <MapPin aria-hidden="true" />
              {privateDetails.detailedDirections}
            </p>
            {privateDetails.meetingContact ? (
              <p className="text-sm text-muted-foreground">
                Meeting contact: {privateDetails.meetingContact}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <ShieldCheck />
          <AlertTitle>Exact directions remain private</AlertTitle>
          <AlertDescription>
            The provider can release meeting directions only after the viewing is confirmed.
          </AlertDescription>
        </Alert>
      )}
      {viewing.status === "confirmed" ? (
        <Card>
          <CardHeader>
            <CardTitle>Safety check-in</CardTitle>
            <CardDescription>
              Record your status before, during and after the visit. “I need help” is visible to
              authorised staff.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ViewingSafetyActions viewingId={id} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
