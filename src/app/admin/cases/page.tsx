import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderKanban, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canModerate, getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Cases",
};

export default async function AdminCasesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Case management is available once Supabase is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");

  const supabase = await createClient();
  const { data: cases } = await supabase
    .from("moderation_cases")
    .select("id, title, category, priority, status, restricted, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cases</h1>
          <p className="mt-1 text-muted-foreground">
            Staff-only moderation and protection-sensitive case queue.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/admin/reports" />}
          nativeButton={false}
        >
          Reports
        </Button>
      </div>

      {(cases ?? []).length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban />
            </EmptyMedia>
            <EmptyTitle>No cases</EmptyTitle>
            <EmptyDescription>
              Listing reports and escalations can be promoted into cases for
              tracked resolution.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(cases ?? []).map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.title}
                  {item.restricted ? (
                    <Badge className="ml-2" variant="destructive">
                      restricted
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>{item.category.replace(/_/g, " ")}</TableCell>
                <TableCell>{item.priority.replace(/_/g, " ")}</TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
