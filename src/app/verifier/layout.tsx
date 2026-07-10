import type { Metadata } from "next";
import { requireVerifier } from "@/lib/portal-auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function VerifierLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireVerifier();
  return children;
}
