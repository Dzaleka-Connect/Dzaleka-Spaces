import type { Metadata } from "next";
import { FileText } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = {
  title: "Trade documents",
};

export default function TradeDocumentsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No trade documents</EmptyTitle>
          <EmptyDescription>
            Quote records and completion evidence appear here after upload.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
