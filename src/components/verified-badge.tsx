"use client";

import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function VerifiedBadge({ verifiedAt }: { verifiedAt?: string | null }) {
  return (
    <Dialog>
      <DialogTrigger
        render={<Badge variant="secondary" className="cursor-pointer" />}
        nativeButton={false}
      >
        <BadgeCheck className="text-primary" />
        Verified space
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What “Verified space” means</DialogTitle>
          <DialogDescription>
            A Dzaleka Spaces field representative visited this location and
            confirmed the details.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>The space exists and photographs reflect its condition.</li>
            <li>The advertised facilities were checked.</li>
            <li>The price and deposit were confirmed.</li>
            <li>
              The provider showed evidence that they currently manage or are
              authorised to offer this space.
            </li>
            {verifiedAt ? <li>Last checked: {verifiedAt}.</li> : null}
          </ul>
          <p className="text-muted-foreground">
            Dzaleka Spaces verified the listing details and the provider&apos;s
            stated authority to offer this space. This verification does not
            establish ownership of land or property.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
