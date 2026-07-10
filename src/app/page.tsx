import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Eye, FileText, MapPin, Search, ShieldCheck } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { ListingCard } from "@/components/listing-card";
import { getFeaturedListings } from "@/lib/listings";
import { listServiceProviders } from "@/lib/trades";
import { SPACE_CATEGORIES } from "@/lib/types";
import { getZoneSummaries } from "@/lib/zones";

export default async function HomePage() {
  const [featured, zones, serviceProviders] = await Promise.all([
    getFeaturedListings(3),
    getZoneSummaries(),
    listServiceProviders(),
  ]);

  return (
    <div>
      <section className="relative flex h-[calc(100dvh-7rem)] min-h-[34rem] max-h-[46rem] items-end overflow-hidden border-b bg-foreground text-white">
        <Image
          src="/dzaleka-marketplace.jpeg"
          alt="Shops, services and people along a commercial street in Dzaleka"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 pt-16 sm:px-6 sm:pb-14">
          <Badge className="w-fit border-white/30 bg-black/40 text-white">
            <BadgeCheck /> Field-checked listing information
          </Badge>
          <div className="max-w-3xl">
            <p className="mb-2 text-sm font-semibold uppercase">Dzaleka Spaces</p>
            <h1 className="text-4xl font-bold sm:text-5xl">
              Find a shop, workspace or community venue
            </h1>
            <p className="mt-3 max-w-2xl text-base text-white/85 sm:text-lg">
              Search by zone and landmark, compare the details checked on site, then arrange a
              viewing before agreeing or paying.
            </p>
          </div>
          <form
            action="/spaces"
            className="flex w-full max-w-3xl flex-col gap-2 border border-white/35 bg-background p-2 text-foreground shadow-lg sm:flex-row"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
              <Search aria-hidden="true" />
              <Input
                name="q"
                placeholder="Zone, landmark, category or keyword"
                className="border-0 shadow-none focus-visible:ring-0"
                aria-label="Search spaces"
              />
            </div>
            <Button type="submit" size="lg">
              Search spaces
            </Button>
          </form>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
            <Link href="/spaces?verified=1" className="hover:underline">
              Verified listings
            </Link>
            <Link href="/zones" className="hover:underline">
              Browse zones
            </Link>
            <Link href="/safety" className="hover:underline">
              Viewing safety
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px px-4 py-6 sm:grid-cols-4 sm:px-6">
          {[
            { icon: Eye, title: "View first", text: "Arrange a visit before agreeing." },
            { icon: MapPin, title: "Location privacy", text: "Only zone and landmark are public." },
            {
              icon: BadgeCheck,
              title: "Details checked",
              text: "Verification never proves ownership.",
            },
            {
              icon: FileText,
              title: "Keep records",
              text: "Occupancy and payments are documented.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 px-2 py-3">
              <item.icon className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">{item.title}</h2>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6"
        aria-labelledby="available-spaces"
      >
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 id="available-spaces" className="text-2xl font-semibold">
              Recently checked spaces
            </h2>
            <p className="mt-1 text-muted-foreground">
              Published listings with current availability information.
            </p>
          </div>
          <Button variant="ghost" size="sm" render={<Link href="/spaces" />} nativeButton={false}>
            View all <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
        {featured.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No published spaces yet</CardTitle>
              <CardDescription>
                Approved listings will appear here after field verification and moderator review.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button render={<Link href="/list-a-space" />} nativeButton={false}>
                List a space
              </Button>
            </CardFooter>
          </Card>
        )}
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold">Browse by use</h2>
            <p className="mt-1 text-muted-foreground">
              Commercial, organisational and approved community spaces.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SPACE_CATEGORIES.slice(0, 10).map((category) => (
              <Button
                key={category.value}
                variant="outline"
                className="h-auto min-h-14 justify-start whitespace-normal bg-background"
                render={<Link href={`/categories/${category.value.replace(/_/g, "-")}`} />}
                nativeButton={false}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Browse by zone</h2>
              <p className="mt-1 text-muted-foreground">
                Counts come from current published listings.
              </p>
            </div>
            <Button variant="ghost" size="sm" render={<Link href="/zones" />} nativeButton={false}>
              All zones <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {zones.slice(0, 6).map((zone) => (
              <Link
                key={zone.slug}
                href={`/zones/${zone.slug}`}
                className="border p-3 transition-colors hover:bg-muted"
              >
                <p className="font-medium">{zone.name}</p>
                <p className="text-sm text-muted-foreground">
                  {zone.listingCount} listing{zone.listingCount === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        </div>
        <Card>
          <CardHeader>
            <ShieldCheck className="text-primary" />
            <CardTitle>What verification means</CardTitle>
            <CardDescription>
              A field representative checks that the space exists, advertised details match, and the
              provider’s stated authority to offer it has been reviewed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              It does not establish land ownership, legal title, or a platform guarantee. Always
              view the space and agree directly with the provider.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" render={<Link href="/verification" />} nativeButton={false}>
              Read the verification standard
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Local maintenance services</h2>
              <p className="mt-1 text-muted-foreground">
                Active profiles for repairs and maintenance work.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/services" />}
              nativeButton={false}
            >
              Service directory <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {serviceProviders.slice(0, 2).map((provider) => (
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
                    ) : null}
                  </div>
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
                    View provider
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-primary">Offer a space</p>
          <h2 className="mt-1 text-2xl font-semibold">
            Publish through review and field verification
          </h2>
          <p className="mt-2 text-muted-foreground">
            Create the space and listing record, state your authority to offer it, upload clear
            media, then follow the review status.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button render={<Link href="/list-a-space" />} nativeButton={false}>
              List a space
            </Button>
            <Button
              variant="outline"
              render={<Link href="/request-assisted-listing" />}
              nativeButton={false}
            >
              Request listing help
            </Button>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-primary">Get support</p>
          <h2 className="mt-1 text-2xl font-semibold">Safety, accounts and occupancy guidance</h2>
          <p className="mt-2 text-muted-foreground">
            Use the help centre for viewing guidance, verification questions, account support and
            record explanations.
          </p>
          <div className="mt-5">
            <Button variant="outline" render={<Link href="/help" />} nativeButton={false}>
              Open help centre
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
