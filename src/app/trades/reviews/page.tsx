import type { Metadata } from "next";
import { Star } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = {
  title: "Trade reviews",
};

export default function TradeReviewsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Star />
          </EmptyMedia>
          <EmptyTitle>No reviews yet</EmptyTitle>
          <EmptyDescription>
            Reviews are created only after a completed work order is confirmed.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
