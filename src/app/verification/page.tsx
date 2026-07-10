import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CircleX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "How verification works",
};

const CHECKED = [
  "A field representative visited the location in person",
  "The space exists and is as described",
  "The photographs reflect the current condition",
  "The advertised facilities were checked (water, sanitation, electricity)",
  "The price and deposit were confirmed with the provider",
  "The provider showed evidence that they currently manage or are authorised to offer the space",
  "The listing was checked within a stated period, with a re-check date",
];

const NOT_CHECKED = [
  "Legal ownership of land or property",
  "A recognised land title",
  "Approval to sell the structure",
  "Government registration of the property",
  "A guarantee that no dispute will ever occur",
];

export default function VerificationPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">How verification works</h1>
        <p className="text-muted-foreground">
          The Verified Space badge tells you exactly what Dzaleka Spaces has checked — no more, no
          less.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <BadgeCheck className="size-6 text-primary" />
            <CardTitle>What we check</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
              {CHECKED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CircleX className="size-6 text-muted-foreground" />
            <CardTitle>What we do not check</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
              {NOT_CHECKED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>The verification steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
            <li>A provider submits a space with their authority declaration.</li>
            <li>An automated completeness check runs on the submission.</li>
            <li>A field verifier from the same zone is assigned.</li>
            <li>The verifier visits, completes a checklist and captures evidence.</li>
            <li>
              A separate reviewer approves, requests changes or rejects — the person who visits
              never publishes their own verification.
            </li>
            <li>The listing is published with its verification date.</li>
            <li>Listings are re-checked periodically; stale ones are paused.</li>
          </ol>
        </CardContent>
      </Card>

      <Alert>
        <BadgeCheck />
        <AlertTitle>The exact wording on every verified listing</AlertTitle>
        <AlertDescription>
          “Dzaleka Spaces verified the listing details and the provider&apos;s stated authority to
          offer this space. This verification does not establish ownership of land or property.”
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-3">
        <Button render={<Link href="/spaces?verified=1" />} nativeButton={false}>
          Browse verified spaces
        </Button>
        <Button variant="outline" render={<Link href="/safety" />} nativeButton={false}>
          Read the safety guidance
        </Button>
      </div>
    </div>
  );
}
