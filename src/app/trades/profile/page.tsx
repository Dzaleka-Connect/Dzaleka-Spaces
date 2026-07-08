import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Info, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSessionUser } from "@/lib/auth";
import { getMyServiceProviderProfile } from "@/lib/trades";
import { saveTradeProfile } from "../actions";

export const metadata: Metadata = {
  title: "Trade profile",
};

export default async function TradeProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const profile = await getMyServiceProviderProfile(user.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trade profile</h1>
        <p className="mt-1 text-muted-foreground">
          This profile controls how your maintenance services appear in the
          directory and job workflow.
        </p>
      </div>

      {params.error ? (
        <Alert variant="destructive">
          <Info />
          <AlertTitle>Profile not saved</AlertTitle>
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}
      {params.saved ? (
        <Alert>
          <Save />
          <AlertTitle>Profile saved</AlertTitle>
          <AlertDescription>Your maintenance profile was updated.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Public service details</CardTitle>
          <CardDescription>
            Use comma-separated lists for categories, zones and languages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveTradeProfile}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="display-name">Display name</FieldLabel>
                <Input
                  id="display-name"
                  name="displayName"
                  required
                  defaultValue={profile?.displayName ?? user.fullName ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="bio">Service description</FieldLabel>
                <Textarea id="bio" name="bio" defaultValue={profile?.bio ?? ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor="categories">Categories</FieldLabel>
                <Input
                  id="categories"
                  name="categories"
                  defaultValue={profile?.categories.join(", ") ?? ""}
                  placeholder="Electrical, Solar, Building repairs"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="zones-served">Zones served</FieldLabel>
                <Input
                  id="zones-served"
                  name="zonesServed"
                  defaultValue={profile?.zonesServed.join(", ") ?? ""}
                  placeholder="Kawale 1, Lisungwi"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="languages">Languages</FieldLabel>
                <Input
                  id="languages"
                  name="languages"
                  defaultValue={profile?.languages.join(", ") ?? ""}
                  placeholder="English, Chichewa, Swahili"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Verified contact</FieldLabel>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={profile?.phone ?? ""}
                />
              </Field>
              <input
                type="hidden"
                name="status"
                value={profile?.status === "active" ? "active" : "draft"}
              />
              <Button type="submit">
                <Save data-icon="inline-start" />
                Save profile
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
