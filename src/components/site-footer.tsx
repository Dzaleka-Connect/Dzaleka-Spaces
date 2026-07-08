import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div className="flex max-w-md flex-col gap-2">
            <span className="font-semibold">Dzaleka Spaces</span>
            <p className="text-sm text-muted-foreground">
              Trusted spaces for work, training, enterprise, approved stays and
              community life. A community space marketplace connected to
              Dzaleka Refugee Camp.
            </p>
          </div>
          <div className="flex gap-10">
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/spaces" className="text-muted-foreground hover:text-foreground">
                Browse spaces
              </Link>
              <Link href="/list-a-space" className="text-muted-foreground hover:text-foreground">
                List a space
              </Link>
              <Link href="/sign-in" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
            </nav>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">
                How it works
              </Link>
              <Link href="/verification" className="text-muted-foreground hover:text-foreground">
                Verification
              </Link>
              <Link href="/safety" className="text-muted-foreground hover:text-foreground">
                Safety centre
              </Link>
            </nav>
          </div>
        </div>
        <Separator />
        <p className="text-xs text-muted-foreground">
          Dzaleka Spaces verifies listing details and a provider&apos;s stated
          authority to offer a space. Verification does not establish ownership
          of land or property. The platform does not sell camp land, issue
          ownership certificates, or hold deposits.
        </p>
      </div>
    </footer>
  );
}
