import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Info } from "lucide-react";
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
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listViewingsForUser } from "@/lib/viewings";

export const metadata: Metadata = {
  title: "Your viewings",
};

export default async function AccountViewingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Viewings are available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const viewings = await listViewingsForUser(user.id, "seeker");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your viewings</h1>
          <p className="mt-1 text-muted-foreground">
            Upcoming and past viewing appointments.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/account" />}
          nativeButton={false}
        >
          Account
        </Button>
      </div>

      {viewings.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Calendar />
            </EmptyMedia>
            <EmptyTitle>No viewings yet</EmptyTitle>
            <EmptyDescription>
              Send an enquiry and request a viewing from the conversation page.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {viewings.map((v) => (
            <Card key={v.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{v.listingTitle}</CardTitle>
                  <Badge variant="outline">{v.status}</Badge>
                </div>
                <CardDescription>
                  {new Date(v.proposedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/account/enquiries/${v.enquiryId}`} />}
                  nativeButton={false}
                >
                  Open enquiry
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
