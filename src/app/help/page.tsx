import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HELP_ARTICLES } from "@/lib/help-articles";

export const metadata: Metadata = {
  title: "Help centre",
  description:
    "Guides for searching, listing, viewings, verification, payments and your account on Dzaleka Spaces.",
};

export default function HelpPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold">Help centre</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Short guides to every part of Dzaleka Spaces. For anything else, contact support — details
          at the bottom.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {HELP_ARTICLES.map((article) => (
          <Link key={article.slug} href={`/help/${article.slug}`}>
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="text-base">{article.title}</CardTitle>
                <CardDescription>{article.summary}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 p-6">
        <LifeBuoy className="size-6 text-primary" />
        <p className="flex-1 text-sm text-muted-foreground">
          Still stuck? Support is available by WhatsApp, phone and at the Dzaleka Online Services
          desk.
        </p>
        <Button variant="outline" render={<Link href="/contact" />} nativeButton={false}>
          Contact support
        </Button>
      </div>
    </div>
  );
}
