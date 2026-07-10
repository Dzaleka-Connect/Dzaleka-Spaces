import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Searching is free. Providers pay small fees for verification, featuring and assisted listings.",
};

const FREE = [
  "Searching and browsing every listing",
  "Viewing verified details and photographs",
  "Saving spaces and searches",
  "Sending enquiries and arranging viewings",
  "Creating a basic listing (verification fee applies before publication)",
  "Reporting a safety concern or false listing",
  "Receipts for recorded payments",
];

const PROVIDER_FEES = [
  ["Verification visit", "MWK 3,000 – 5,000", "One-time, per listing, agreed before the visit"],
  ["Featured placement", "MWK 2,000 – 4,000", "14 or 30 days, clearly labelled as featured"],
  ["Assisted listing", "MWK 3,000 – 7,500", "Field visit, photographs, write-up and submission"],
];

export default function PricingPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Finding a space is free — the costs sit with providers, kept small and agreed in advance.
          All amounts are pilot prices and may be adjusted with advisory-group review.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Always free</CardTitle>
          <CardDescription>
            Charging people to look for somewhere to live or work would shut out the people the
            platform exists for.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
            {FREE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider fees</CardTitle>
          <CardDescription>
            Fees are always agreed before work starts. Organisations can sponsor free verification
            for low-income providers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Pilot price</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PROVIDER_FEES.map(([service, price, notes]) => (
                <TableRow key={service}>
                  <TableCell className="font-medium">{service}</TableCell>
                  <TableCell>{price}</TableCell>
                  <TableCell className="text-muted-foreground">{notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What we never charge for</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
            <li>A percentage of anyone&apos;s rent</li>
            <li>Application fees for people seeking spaces</li>
            <li>Safety reports or dispute reporting</li>
            <li>Holding deposits — the platform never holds funds</li>
            <li>Late-payment penalties</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
