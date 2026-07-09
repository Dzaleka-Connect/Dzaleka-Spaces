import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Building2,
  CalendarCheck,
  FileText,
  GraduationCap,
  Hammer,
  Home,
  Search,
  ShieldCheck,
  Store,
  Users2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListingCard } from "@/components/listing-card";
import { getFeaturedListings } from "@/lib/listings";
import { SPACE_CATEGORIES } from "@/lib/types";

const CATEGORY_ICONS: Record<string, typeof Store> = {
  community_venue: Users2,
  training_space: GraduationCap,
  meeting_venue: Users2,
  office: Building2,
  shop: Store,
  workshop: Hammer,
  storage: Boxes,
  homestay: Home,
};

const STATS: { value: string; label: string }[] = [
  { value: "57,438", label: "residents recorded in Dzaleka (Mar 2025)" },
  { value: "In person", label: "every verified space is visited by a field rep" },
  { value: "Zone only", label: "public locations — exact addresses stay private" },
  { value: "No custody", label: "payments are recorded, never held" },
];

export default async function HomePage() {
  const featured = await getFeaturedListings(3);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/8 via-background to-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_-10%,var(--color-primary)/12%,transparent)]"
        />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:py-24">
          <div className="flex max-w-2xl flex-col items-start gap-5">
            <Badge className="gap-1 border-success/30 bg-success/12 text-success">
              <BadgeCheck className="text-success" />
              Community-verified spaces
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Find space. Confirm details.{" "}
              <span className="text-primary">Manage it simply.</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Discover verified shops, offices, training rooms, community venues,
              workshops, storage and approved homestays across Dzaleka Refugee
              Camp — then view before paying and keep a written record of your
              arrangement.
            </p>

            {/* Inline search — plain GET form, works without JS */}
            <form
              action="/spaces"
              className="flex w-full max-w-xl flex-col gap-2 rounded-2xl border bg-card p-2 shadow-sm sm:flex-row"
            >
              <div className="flex flex-1 items-center gap-2 px-2">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  name="q"
                  placeholder="Search by landmark, zone or keyword…"
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  aria-label="Search spaces"
                />
              </div>
              <Button type="submit" size="lg">
                Search spaces
              </Button>
            </form>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <Link href="/spaces?verified=1" className="hover:text-foreground">
                Verified only
              </Link>
              <span aria-hidden>·</span>
              <Link href="/zones" className="hover:text-foreground">
                Browse by zone
              </Link>
              <span aria-hidden>·</span>
              <Link href="/how-it-works" className="hover:text-foreground">
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust stats */}
      <section className="border-b bg-muted/40">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-none px-4 py-8 sm:grid-cols-4 sm:gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 px-2">
              <span className="text-2xl font-bold tracking-tight text-primary">
                {s.value}
              </span>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Featured spaces
            </h2>
            <p className="mt-1 text-muted-foreground">
              Recently verified and available now.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/spaces" />}
            nativeButton={false}
          >
            View all
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-14">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">
            Browse by category
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SPACE_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.value] ?? Building2;
              return (
                <Link
                  key={c.value}
                  href={`/categories/${c.value.replace(/_/g, "-")}`}
                >
                  <Card className="group h-full py-5 transition-colors hover:border-primary/40 hover:bg-card">
                    <CardHeader className="items-start gap-3">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="size-5" />
                      </span>
                      <CardTitle className="text-sm">{c.label}</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">
          Trust, built in
        </h2>
        <p className="mb-6 max-w-2xl text-muted-foreground">
          Dzaleka Spaces is not a conventional property site. Every step is
          designed for a camp where trust, privacy and safety matter most.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          <Card className="border-success/20">
            <CardHeader>
              <span className="flex size-11 items-center justify-center rounded-xl bg-success/12 text-success">
                <ShieldCheck className="size-5" />
              </span>
              <CardTitle>Verified in person</CardTitle>
              <CardDescription>
                A field representative visits each verified space to confirm it
                exists, photographs match, facilities and price are real, and
                the provider is authorised to offer it. Verification never
                claims land or property ownership.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarCheck className="size-5" />
              </span>
              <CardTitle>View before paying</CardTitle>
              <CardDescription>
                Request a viewing through the platform, meet the provider, and
                only agree once you have seen the space. Dzaleka Spaces never
                asks for payment to arrange a viewing.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="size-5" />
              </span>
              <CardTitle>Keep a written record</CardTitle>
              <CardDescription>
                When you agree, the platform generates a simple occupancy record
                — amount, deposit, start date and notice period — that both
                sides confirm and keep.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Provider CTA */}
      <section className="border-t bg-primary/5">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-4 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight">
              Manage a space? Reach more people.
            </h2>
            <p className="mt-2 text-muted-foreground">
              List a shop, office, venue, workshop, storage or homestay you
              manage. Verification is done in person, and simple tools help you
              handle enquiries, viewings, occupancy records and receipts. New to
              it? The provider guide walks you through everything.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button
              size="lg"
              render={<Link href="/list-a-space" />}
              nativeButton={false}
            >
              <Wrench data-icon="inline-start" />
              List a space
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/help/provider-guide" />}
              nativeButton={false}
            >
              Read the provider guide
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
