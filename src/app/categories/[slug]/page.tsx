import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ListingCard } from "@/components/listing-card";
import { getListings } from "@/lib/listings";
import { SPACE_CATEGORIES } from "@/lib/types";

const CATEGORY_INTROS: Record<string, string> = {
  community_venue:
    "Halls and community venues for meetings, ceremonies, trainings and events.",
  training_space:
    "Rooms equipped for courses and workshops — many with electricity and internet.",
  meeting_venue: "Smaller rooms for committees, study groups and gatherings.",
  office: "Office rooms for organisations, freelancers and small teams.",
  shop: "Shop spaces in and around the market areas.",
  workshop: "Workshops for carpentry, tailoring, repairs and light trades.",
  storage: "Dry, lockable storage rooms for stock and equipment.",
  homestay:
    "Visitor rooms operated through the approved homestay programme, connected with Visit Dzaleka.",
};

function categoryFromSlug(slug: string) {
  return SPACE_CATEGORIES.find((c) => c.value.replace(/_/g, "-") === slug);
}

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = categoryFromSlug(slug);
  return {
    title: category ? `${category.label}s in Dzaleka` : "Category not found",
    description: category ? CATEGORY_INTROS[category.value] : undefined,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) notFound();

  const listings = await getListings({ category: category.value });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {category.label}s
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          {CATEGORY_INTROS[category.value]}
        </p>
      </div>

      {listings.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>Nothing available right now</EmptyTitle>
            <EmptyDescription>
              New {category.label.toLowerCase()}s appear here as soon as they
              pass field verification.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            variant="outline"
            render={<Link href="/spaces" />}
            nativeButton={false}
          >
            Browse all spaces
          </Button>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
