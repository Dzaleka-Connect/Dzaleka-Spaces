import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivacyRequestForm } from "@/components/privacy-request-form";
import { requireUser } from "@/lib/portal-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Privacy controls" };

export default async function AccountPrivacyPage() {
  const user = await requireUser();
  let requests: { id: string; request_type: string; status: string; created_at: string }[] = [];
  if (isSupabaseConfigured()) {
    const { data } = await (
      await createClient()
    )
      .from("privacy_requests")
      .select("id, request_type, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    requests = data ?? [];
  }
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-medium text-primary">Account</p>
        <h1 className="text-3xl font-bold">Privacy controls</h1>
        <p className="mt-1 text-muted-foreground">
          Request access, correction, export, deletion or restriction of your account data.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>New privacy request</CardTitle>
          <CardDescription>
            Requests are reviewed by authorised staff. Some records may need to be retained for
            safety, legal or financial audit reasons.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrivacyRequestForm />
        </CardContent>
      </Card>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Request history</h2>
        {requests.length ? (
          <div className="flex flex-col gap-2">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 border p-4"
              >
                <div>
                  <p className="font-medium capitalize">
                    {request.request_type.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString("en-MW")}
                  </p>
                </div>
                <Badge variant="outline">{request.status.replace(/_/g, " ")}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No privacy requests submitted.</p>
        )}
      </section>
    </div>
  );
}
