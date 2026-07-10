import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = TRADE_CATEGORIES.find((item) => slugify(item) === slug);
  return category
    ? {
        title: `${category} services`,
        description: `Find active ${category.toLowerCase()} service providers serving Dzaleka.`,
      }
    : {};
}

export default async function ServiceCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = TRADE_CATEGORIES.find((item) => slugify(item) === slug);
  if (!category) notFound();
  const providers = (await listServiceProviders()).filter((provider) =>
    provider.categories.some((item) => slugify(item) === slug)
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header>
        <p className="text-sm font-medium text-primary">Maintenance services</p>
        <h1 className="text-4xl font-bold">{category}</h1>
        <p className="mt-2 text-muted-foreground">
          Active providers who list this service. Confirm the quote and schedule before work begins.
        </p>
      </header>
      {providers.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <Card key={provider.userId}>
              <CardHeader>
                <CardTitle>{provider.displayName}</CardTitle>
                <CardDescription>
                  {provider.zonesServed.join(", ") || "Zones available on request"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>{provider.bio}</p>
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No active provider in this category</CardTitle>
            <CardDescription>
              Report the maintenance issue through your occupancy record so a provider or staff
              member can help find a suitable service.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
