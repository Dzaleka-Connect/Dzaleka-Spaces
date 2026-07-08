import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Trade settings",
};

export default function TradeSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Trade settings</h1>
      <Card>
        <CardHeader>
          <Settings />
          <CardTitle>Profile and availability</CardTitle>
          <CardDescription>
            Your public service profile controls discoverability and job
            eligibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            render={<Link href="/trades/profile" />}
            nativeButton={false}
          >
            Edit trade profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
