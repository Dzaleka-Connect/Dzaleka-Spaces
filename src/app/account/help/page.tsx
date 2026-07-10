import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Account help" };

const HELP = [
  {
    title: "Safe viewings",
    description: "Prepare for a visit, use check-ins and avoid advance viewing fees.",
    href: "/safety",
  },
  {
    title: "Occupancy records",
    description: "Understand confirmations, terms, charges and documents.",
    href: "/help/occupancy-records",
  },
  {
    title: "Report a problem",
    description: "Contact support about privacy, safety, false listings or account access.",
    href: "/contact",
  },
];

export default function AccountHelpPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-medium text-primary">Account</p>
        <h1 className="text-3xl font-bold">Help</h1>
        <p className="mt-1 text-muted-foreground">
          Guidance for account, viewing, occupancy and safety workflows.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {HELP.map((item) => (
          <Card key={item.href}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" render={<Link href={item.href} />} nativeButton={false}>
                Open guide
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
