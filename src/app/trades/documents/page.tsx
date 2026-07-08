import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { MaintenanceDocumentUpload } from "@/components/maintenance-document-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSessionUser } from "@/lib/auth";
import {
  listMyMaintenanceDocuments,
  listMyMaintenanceThreads,
} from "@/lib/trades";

export const metadata: Metadata = {
  title: "Trade documents",
};

function formatBytes(size: number | null) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TradeDocumentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const [documents, threads] = await Promise.all([
    listMyMaintenanceDocuments(user.id),
    listMyMaintenanceThreads(user.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="mt-1 text-muted-foreground">
          Private evidence and quote files for your maintenance jobs.
        </p>
      </div>

      {threads.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Upload</h2>
          <MaintenanceDocumentUpload
            tickets={threads.map((thread) => ({
              id: thread.ticketId,
              title: thread.ticketTitle,
            }))}
          />
        </div>
      ) : null}

      {documents.length === 0 ? (
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
          <Button
            variant="outline"
            render={<Link href="/trades/jobs" />}
            nativeButton={false}
          >
            Open jobs
          </Button>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{doc.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {doc.ticketTitle}
                  {doc.byteSize ? ` · ${formatBytes(doc.byteSize)}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(doc.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{doc.kind}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <a href={`/api/maintenance-documents/${doc.id}`} />
                  }
                  nativeButton={false}
                >
                  Open
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
