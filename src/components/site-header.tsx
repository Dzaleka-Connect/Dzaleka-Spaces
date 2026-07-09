import Link from "next/link";
import Image from "next/image";
import { CircleUserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MobilePublicNav } from "@/components/mobile-public-nav";
import { getDashboardPath, getSessionUser } from "@/lib/auth";
import { getPublicHeaderLinks } from "@/lib/nav";

export async function SiteHeader() {
  const user = await getSessionUser();
  const homeHref = user ? getDashboardPath(user) : "/";
  const publicLinks = user ? [] : await getPublicHeaderLinks();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div
        className={`mx-auto flex h-14 w-full items-center justify-between gap-3 px-4 ${
          user ? "max-w-none" : "max-w-6xl"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {user ? (
            <SidebarTrigger className="-ml-1" />
          ) : (
            <MobilePublicNav links={publicLinks} />
          )}
          <Link
            href={homeHref}
            className={`flex items-center gap-2 font-semibold whitespace-nowrap ${
              user ? "md:hidden" : ""
            }`}
          >
            <Image
              src="/logo-mark-teal.svg"
              alt=""
              width={28}
              height={28}
              className="size-7 shrink-0"
              unoptimized
              priority
            />
            <span className="hidden sm:inline">Dzaleka Spaces</span>
          </Link>
        </div>

        {!user ? (
          <nav className="hidden items-center gap-1 md:flex">
            {publicLinks.map((link) => (
              <Button
                key={link.href}
                variant="ghost"
                size="sm"
                render={<Link href={link.href} />}
                nativeButton={false}
              >
                {link.label}
              </Button>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              render={<Link href={homeHref} />}
              nativeButton={false}
            >
              <CircleUserRound data-icon="inline-start" />
              <span className="hidden sm:inline">Dashboard</span>
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
        </div>
      </div>
    </header>
  );
}
