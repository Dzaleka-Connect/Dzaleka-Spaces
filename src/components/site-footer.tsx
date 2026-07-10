import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const FOOTER_COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Find",
    links: [
      ["Browse spaces", "/spaces"],
      ["Browse by zone", "/zones"],
      ["Map", "/spaces/map"],
      ["Compare", "/compare"],
      ["Maintenance services", "/services"],
    ],
  },
  {
    title: "Offer",
    links: [
      ["List a space", "/list-a-space"],
      ["Assisted listing", "/request-assisted-listing"],
      ["Pricing", "/pricing"],
      ["Listing rules", "/listing-rules"],
    ],
  },
  {
    title: "Learn",
    links: [
      ["How it works", "/how-it-works"],
      ["Verification", "/verification"],
      ["Safety centre", "/safety"],
      ["Help centre", "/help"],
    ],
  },
  {
    title: "Platform",
    links: [
      ["About", "/about"],
      ["Partners", "/partners"],
      ["Contact", "/contact"],
      ["Sign in", "/sign-in"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="flex max-w-xs flex-col gap-2">
            <span className="font-semibold">Dzaleka Spaces</span>
            <p className="text-sm text-muted-foreground">
              Community space marketplace for Dzaleka Refugee Camp.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_COLUMNS.map((column) => (
              <nav key={column.title} className="flex flex-col gap-2 text-sm">
                <span className="font-medium">{column.title}</span>
                {column.links.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-3">
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/community-guidelines" className="hover:text-foreground">
              Community guidelines
            </Link>
            <Link href="/accessibility" className="hover:text-foreground">
              Accessibility
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            Dzaleka Spaces verifies listing details and a provider&apos;s stated authority to offer
            a space. Verification does not establish ownership of land or property. The platform
            does not sell camp land, issue ownership certificates, or hold deposits.
          </p>
        </div>
      </div>
    </footer>
  );
}
