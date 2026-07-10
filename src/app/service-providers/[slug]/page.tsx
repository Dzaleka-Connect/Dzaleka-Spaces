import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Languages, MapPin, Phone, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceProviderBySlug } from "@/lib/trades";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const provider = await getServiceProviderBySlug((await params).slug);
  return provider
    ? {
        title: provider.displayName,
        description: provider.bio || `Service provider serving ${provider.zonesServed.join(", ")}.`,
      }
    : {};
}

export default async function ServiceProviderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const provider = await getServiceProviderBySlug((await params).slug);
  if (!provider) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="border-b pb-6">
        <div className="flex flex-wrap items-center gap-2">
          {provider.verifiedAt ? (
            <Badge>
              <BadgeCheck /> Contact checked
            </Badge>
          ) : (
            <Badge variant="secondary">Active profile</Badge>
          )}
        </div>
        <h1 className="mt-3 text-4xl font-bold">{provider.displayName}</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
          {provider.bio || "Local maintenance service provider."}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {provider.categories.map((category) => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Coverage and contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="flex gap-2">
              <MapPin aria-hidden="true" />{" "}
              {provider.zonesServed.join(", ") || "Ask about your zone"}
            </p>
            <p className="flex gap-2">
              <Languages aria-hidden="true" /> {provider.languages.join(", ") || "Not specified"}
            </p>
            {provider.phone ? (
              <p className="flex gap-2">
                <Phone aria-hidden="true" /> {provider.phone}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <Alert>
        <ShieldCheck />
        <AlertTitle>Confirm scope, amount and schedule first</AlertTitle>
        <AlertDescription>
          Dzaleka Spaces lists active service profiles and records work orders. It does not
          guarantee workmanship or hold payment. Exact work locations remain private until
          assignment.
        </AlertDescription>
      </Alert>
      <div>
        <Button render={<Link href="/account/maintenance/new" />} nativeButton={false}>
          Report a maintenance issue
        </Button>
      </div>
    </div>
  );
}
