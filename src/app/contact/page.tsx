import type { Metadata } from "next";
import Link from "next/link";
import { Flag, LifeBuoy, MessageCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach the Dzaleka Spaces team.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact</h1>
        <p className="mt-1 text-muted-foreground">
          Choose the channel that fits — every route below reaches a real
          person on the platform team.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <MessageCircle className="size-5 text-primary" />
            <CardTitle>WhatsApp and phone</CardTitle>
            <CardDescription>
              Support in English, Chichewa, Swahili, French and Kirundi during
              working hours. Numbers are published on posters at community
              venues and via Dzaleka Online channels.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Store className="size-5 text-primary" />
            <CardTitle>In person</CardTitle>
            <CardDescription>
              Visit the Dzaleka Online Services desk — staff can search, list
              and record arrangements with you on the spot.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Store className="size-5 text-primary" />
            <CardTitle>List with help</CardTitle>
            <CardDescription>
              No smartphone? Request an assisted listing and a field
              representative will visit your space.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/request-assisted-listing" />}
              nativeButton={false}
            >
              Request an assisted listing
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Flag className="size-5 text-primary" />
            <CardTitle>Report a problem</CardTitle>
            <CardDescription>
              False listings, deposit problems, harassment or safety concerns
              — use the private report button on any listing page. Reports are
              confidential.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/safety" />}
              nativeButton={false}
            >
              Read the safety guidance
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/40 p-6">
        <LifeBuoy className="size-6 text-primary" />
        <p className="flex-1 text-sm text-muted-foreground">
          Urgent protection concerns are referred to approved protection and
          legal-support pathways in the camp — not handled by the platform
          alone.
        </p>
      </div>
    </div>
  );
}
