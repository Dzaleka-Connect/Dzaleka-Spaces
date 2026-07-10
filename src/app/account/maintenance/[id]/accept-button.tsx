"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptQuoteAction } from "../actions";
import { toast } from "sonner";

export function AcceptQuoteButton({ quoteId, ticketId }: { quoteId: string; ticketId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    if (
      !confirm(
        "Are you sure you want to accept this quote? It will decline all other quotes and assign this tradesperson."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await acceptQuoteAction(quoteId, ticketId);
      if (res.ok) {
        toast.success("Quote accepted!");
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Button
      variant="default"
      size="sm"
      className="w-full gap-2"
      onClick={handleAccept}
      disabled={isPending}
    >
      <Check className="size-4" />
      <span>Accept Quote</span>
    </Button>
  );
}
