import Link from "next/link";
import { Building2, CircleUserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold whitespace-nowrap"
        >
          <Building2 className="size-5 shrink-0 text-primary" />
          <span className="hidden sm:inline">Dzaleka Spaces</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/spaces" />}
            nativeButton={false}
          >
            Browse spaces
          </Button>
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/account" />}
              nativeButton={false}
            >
              <CircleUserRound data-icon="inline-start" />
              Account
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              render={<Link href="/sign-in" />}
              nativeButton={false}
            >
              Sign in
            </Button>
          )}
          <Button
            size="sm"
            render={<Link href="/list-a-space" />}
            nativeButton={false}
          >
            List a space
          </Button>
        </nav>
      </div>
    </header>
  );
}
