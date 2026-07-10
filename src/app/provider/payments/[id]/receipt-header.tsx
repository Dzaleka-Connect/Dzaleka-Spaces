"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReceiptHeader() {
  return (
    <div className="flex items-center justify-between print:hidden">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/provider/payments" />}
        nativeButton={false}
      >
        <ArrowLeft className="mr-2 size-4" />
        Back to payments
      </Button>
      <Button onClick={() => window.print()} className="gap-2">
        <Printer className="size-4" />
        Print Receipt
      </Button>
    </div>
  );
}
