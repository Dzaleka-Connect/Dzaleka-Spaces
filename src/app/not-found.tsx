import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-4 py-12">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>Page or record not found</EmptyTitle>
          <EmptyDescription>
            It may have been removed, archived, or unavailable to your account.
          </EmptyDescription>
        </EmptyHeader>
        <div className="flex gap-2">
          <Button render={<Link href="/spaces" />} nativeButton={false}>
            Browse spaces
          </Button>
          <Button variant="outline" render={<Link href="/help" />} nativeButton={false}>
            Help centre
          </Button>
        </div>
      </Empty>
    </div>
  );
}
