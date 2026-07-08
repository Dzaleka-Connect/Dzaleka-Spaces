import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { MaintenanceReviewForm } from "@/components/maintenance-review-form";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSessionUser } from "@/lib/auth";
import {
  listMyMaintenanceReviews,
  listReviewableWorkOrders,
} from "@/lib/trades";

export const metadata: Metadata = {
  title: "Trade reviews",
};

export default async function TradeReviewsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const [reviews, reviewable] = await Promise.all([
    listMyMaintenanceReviews(user.id),
    listReviewableWorkOrders(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
        <p className="mt-1 text-muted-foreground">
          Requesters can rate completed work. Service providers see reviews of
          their jobs.
        </p>
      </div>

      {reviewable.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Leave a review</h2>
          <MaintenanceReviewForm reviewable={reviewable} />
        </div>
      ) : null}

      {reviews.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Star />
            </EmptyMedia>
            <EmptyTitle>No reviews yet</EmptyTitle>
            <EmptyDescription>
              Reviews appear after a requester rates a completed work order.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{review.ticketTitle}</p>
                <Badge variant="secondary">{review.rating} / 5</Badge>
              </div>
              {review.comment ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {review.comment}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
