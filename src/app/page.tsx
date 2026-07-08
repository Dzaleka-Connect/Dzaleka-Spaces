import Link from "next/link";
import {
  BadgeCheck,
  CalendarCheck,
  FileText,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListingCard } from "@/components/listing-card";
import { getFeaturedListings } from "@/lib/listings";
import { SPACE_CATEGORIES } from "@/lib/types";

export default async function HomePage() {
  const featured = await getFeaturedListings(3);

  return (
    <div className="flex flex-col">
      <section className="border-b bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:py-24">
          <Badge variant="secondary">Community space marketplace</Badge>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Find space. Confirm details. Manage it simply.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Find verified information about available shops, offices, training
            rooms and community spaces in Dzaleka. View before paying and keep
            a record of your arrangement.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/spaces" />} nativeButton={false}>
              <Search data-icon="inline-start" />
              Browse spaces
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/list-a-space" />}
              nativeButton={false}
            >
              List your space
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            Featured spaces
          </h2>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/spaces" />}
            nativeButton={false}
          >
            View all
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-6">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">
          Browse by category
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SPACE_CATEGORIES.map((c) => (
            <Link key={c.value} href={`/spaces?category=${c.value}`}>
              <Card className="h-full py-4 transition-colors hover:bg-accent">
                <CardHeader>
                  <CardTitle className="text-sm">{c.label}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <BadgeCheck className="size-6 text-primary" />
              <CardTitle>Verified in person</CardTitle>
              <CardDescription>
                A field representative visits each verified space to confirm it
                exists, photographs match, and the provider is authorised to
                offer it. Verification never claims land or property ownership.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CalendarCheck className="size-6 text-primary" />
              <CardTitle>View before paying</CardTitle>
              <CardDescription>
                Request a viewing through the platform, meet the provider, and
                only agree once you have seen the space. Never pay before a
                viewing.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <FileText className="size-6 text-primary" />
              <CardTitle>Keep a written record</CardTitle>
              <CardDescription>
                When you agree, the platform generates a simple occupancy
                record in English, Chichewa, Swahili, French or Kirundi — so
                both sides know what was agreed.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}
