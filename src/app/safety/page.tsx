import type { Metadata } from "next";
import {
  Banknote,
  Eye,
  FileCheck,
  Flag,
  IdCard,
  LifeBuoy,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Safety centre",
};

const GUIDANCE = [
  {
    icon: Eye,
    title: "View before paying",
    body: "Never pay rent or a deposit for a space you have not seen in person. Dzaleka Spaces never asks for payment to arrange a viewing.",
  },
  {
    icon: Banknote,
    title: "Confirm the amount and deposit",
    body: "Agree the exact amount, the billing period and any deposit before moving in — and record it in the occupancy record so both sides have the same numbers.",
  },
  {
    icon: Receipt,
    title: "Ask for a receipt",
    body: "Every payment you make should be recorded with a receipt. If a provider refuses to give receipts, report the listing.",
  },
  {
    icon: IdCard,
    title: "Protect identity documents",
    body: "Never hand over your original identity or registration documents as a condition of renting. No legitimate provider on this platform requires that.",
  },
  {
    icon: FileCheck,
    title: "Do not rely on an ownership claim",
    body: "Nobody can sell you camp land or issue an ownership certificate. If a listing claims to sell land or a shelter, report it — such listings are prohibited.",
  },
  {
    icon: Flag,
    title: "Report false listings",
    body: "Use the Report listing function on any listing page for false photographs, wrong prices, double-promised spaces or unauthorised listings. Reports are confidential.",
  },
  {
    icon: ShieldAlert,
    title: "Report harassment",
    body: "Harassment, discrimination or threats connected to a listing or viewing can be reported privately. The reported person is not told who reported them.",
  },
  {
    icon: LifeBuoy,
    title: "Urgent concerns",
    body: "Concerns involving immediate safety or protection are referred to approved protection and legal-support pathways in the camp — not investigated by the platform alone.",
  },
];

export default function SafetyPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">Safety centre</h1>
        <p className="max-w-2xl text-muted-foreground">
          Simple rules that protect you when finding or offering a space.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {GUIDANCE.map((g) => (
          <Card key={g.title}>
            <CardHeader>
              <g.icon className="size-6 text-primary" />
              <CardTitle>{g.title}</CardTitle>
              <CardDescription>{g.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Alert>
        <ShieldAlert />
        <AlertTitle>The golden rule</AlertTitle>
        <AlertDescription>
          If someone asks you to pay before you have viewed a space, or asks for your identity
          documents to “secure” it, stop and report the listing. Reporting is free, private and
          never counted against you.
        </AlertDescription>
      </Alert>
    </div>
  );
}
