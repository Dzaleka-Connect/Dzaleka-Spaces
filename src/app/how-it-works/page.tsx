import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarCheck,
  FileText,
  MessageCircleQuestion,
  Search,
  ShieldAlert,
  Upload,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "How it works",
};

const STEPS = [
  {
    icon: Search,
    title: "Finding a space",
    body: "Search by zone, landmark, category, budget and facilities. Every published listing shows what was checked and when. You never need an account just to search.",
  },
  {
    icon: Upload,
    title: "Listing a space",
    body: "Describe the space you manage, state the basis of your authority to offer it, and submit. Nothing is published until a field representative has visited and an administrator has approved it.",
  },
  {
    icon: CalendarCheck,
    title: "Viewing safely",
    body: "Request a viewing through the platform. Meet at the space, check everything matches the listing, and only then agree. Never pay anything before a viewing.",
  },
  {
    icon: BadgeCheck,
    title: "Understanding verification",
    body: "A Verified badge means we visited the space, checked the photographs, facilities, price and the provider's stated authority to offer it. It never means legal ownership of land or property.",
  },
  {
    icon: FileText,
    title: "Recording an arrangement",
    body: "When both sides agree, the platform generates a simple occupancy record — names, amount, deposit, start date, notice period — in English, Chichewa, Swahili, French or Kirundi.",
  },
  {
    icon: FileText,
    title: "Recording payments",
    body: "Cash, Airtel Money, TNM Mpamba and DzalekaPay references can be recorded against the arrangement, with receipts for both sides. Dzaleka Spaces never holds your money.",
  },
  {
    icon: Wrench,
    title: "Reporting maintenance",
    body: "Occupants can report problems with photographs and urgency levels; providers respond and can bring in local builders, electricians and plumbers. (Coming after the marketplace pilot.)",
  },
  {
    icon: ShieldAlert,
    title: "Raising a concern",
    body: "Every listing has a private report function for false information, deposit problems, harassment or safety concerns. Urgent protection concerns are referred to approved support pathways.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">How it works</h1>
        <p className="max-w-2xl text-muted-foreground">
          Dzaleka Spaces helps people find trusted places to work, meet, train, operate businesses
          and book approved stays — while giving space providers simple tools to manage records,
          enquiries and maintenance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {STEPS.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <s.icon className="size-6 text-primary" />
              <CardTitle>{s.title}</CardTitle>
              <CardDescription>{s.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 p-6">
        <MessageCircleQuestion className="size-6 text-primary" />
        <p className="flex-1 text-sm text-muted-foreground">
          Questions about verification, listings or safety?
        </p>
        <Button variant="outline" render={<Link href="/verification" />} nativeButton={false}>
          About verification
        </Button>
        <Button render={<Link href="/safety" />} nativeButton={false}>
          Safety centre
        </Button>
      </div>
    </div>
  );
}
