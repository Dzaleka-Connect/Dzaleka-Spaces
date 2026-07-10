import type { Metadata } from "next";
import { requireModerator } from "@/lib/portal-auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireModerator();
  return children;
}
