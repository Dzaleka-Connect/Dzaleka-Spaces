import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getDashboardPath, getSessionUser } from "@/lib/auth";
import { getAppNav } from "@/lib/nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Dzaleka Spaces — Find space. Confirm details. Manage it simply.",
    template: "%s | Dzaleka Spaces",
  },
  description:
    "Find verified information about available shops, offices, venues, workshops, storage and approved homestays in Dzaleka. View before paying and keep a record of your arrangement.",
  manifest: "/manifest.webmanifest",
};

function userDisplay(user: {
  fullName: string | null;
  email: string | null;
}) {
  const name = user.fullName || user.email || "Signed in";
  const email = user.email || "";
  const source = (user.fullName || user.email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
      : source.slice(0, 2).toUpperCase();
  return { name, email, initials };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const nav = user ? await getAppNav(user) : [];
  const display = user ? userDisplay(user) : null;
  const homeHref = user ? getDashboardPath(user) : "/";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <TooltipProvider>
          {user && display ? (
            <SidebarProvider>
              <AppSidebar user={display} nav={nav} homeHref={homeHref} />
              <SidebarInset>
                <SiteHeader />
                <main className="flex-1">{children}</main>
              </SidebarInset>
            </SidebarProvider>
          ) : (
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          )}
        </TooltipProvider>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
