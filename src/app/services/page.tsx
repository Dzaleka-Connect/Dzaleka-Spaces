import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listServiceProviders } from "@/lib/trades";
import { TRADE_CATEGORIES } from "@/lib/types";

export const metadata: Metadata = {
  title: "Local maintenance services",
  description:
    "Find local service providers for repairs, electrical work, plumbing, solar, carpentry, cleaning and other approved maintenance work.",
};

function categorySlug(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default async function ServicesPage() {
  const providers = await listServiceProviders();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <Badge variant="secondary">
          <Wrench /> Local maintenance directory
        </Badge>
        <h1 className="mt-4 text-4xl font-bold">Find help for repairs and maintenance</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Compare service categories, zones served, languages and contact details. Exact work
          locations are released only after a job is assigned.
        </p>
      </header>

      <section aria-labelledby="service-categories">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="service-categories" className="text-2xl font-semibold">
              Browse services
            </h2>
            <p className="text-muted-foreground">Choose the kind of work you need.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TRADE_CATEGORIES.map((category) => (
            <Button
              key={category}
              variant="outline"
              className="h-auto min-h-14 justify-start whitespace-normal"
              render={<Link href={`/services/${categorySlug(category)}`} />}
              nativeButton={false}
            >
              {category}
            </Button>
          ))}
        </div>
      </section>

      <section aria-labelledby="service-providers">
        <div className="mb-4">
          <h2 id="service-providers" className="text-2xl font-semibold">
            Available providers
          </h2>
          <p className="text-muted-foreground">Profiles are shown only while active.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <Card key={provider.userId}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{provider.displayName}</CardTitle>
                    <CardDescription>{provider.categories.join(" · ")}</CardDescription>
                  </div>
                  {provider.verifiedAt ? (
                    <Badge>
                      <BadgeCheck /> Contact checked
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Profile active</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p>{provider.bio || "Service details are available on the provider profile."}</p>
                <p className="text-sm text-muted-foreground">
                  Zones: {provider.zonesServed.join(", ") || "Ask the provider"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Languages: {provider.languages.join(", ") || "Not specified"}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  render={<Link href={`/service-providers/${provider.slug}`} />}
                  nativeButton={false}
                >
                  View profile <ArrowRight data-icon="inline-end" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
