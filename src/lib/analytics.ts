import "server-only";

import {
  ANALYTICS_EVENT_KEYS,
  EVENT_COLORS,
  EVENT_LABELS,
  type AnalyticsBreakdownItem,
  type AnalyticsDashboard,
  type AnalyticsDayPoint,
  type AnalyticsEventKey,
  type AnalyticsFunnelStep,
  type AnalyticsTotals,
} from "@/lib/analytics-types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type {
  AnalyticsBreakdownItem,
  AnalyticsDashboard,
  AnalyticsDayPoint,
  AnalyticsEventKey,
  AnalyticsFunnelStep,
  AnalyticsTotals,
} from "@/lib/analytics-types";
export { ANALYTICS_EVENT_KEYS, EVENT_COLORS, EVENT_LABELS } from "@/lib/analytics-types";

function emptyTotals(): AnalyticsTotals {
  return {
    listing_view: 0,
    search: 0,
    enquiry_sent: 0,
    report_sent: 0,
  };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function buildEmptyDaily(days: number): AnalyticsDayPoint[] {
  const points: AnalyticsDayPoint[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    points.push({
      date: dayKey(date),
      label: dayLabel(date),
      listing_view: 0,
      search: 0,
      enquiry_sent: 0,
      report_sent: 0,
      total: 0,
    });
  }
  return points;
}

function totalsFromDaily(daily: AnalyticsDayPoint[]): AnalyticsTotals {
  return daily.reduce((acc, day) => {
    acc.listing_view += day.listing_view;
    acc.search += day.search;
    acc.enquiry_sent += day.enquiry_sent;
    acc.report_sent += day.report_sent;
    return acc;
  }, emptyTotals());
}

function breakdownFromTotals(totals: AnalyticsTotals): AnalyticsBreakdownItem[] {
  return ANALYTICS_EVENT_KEYS.map((key) => ({
    key,
    label: EVENT_LABELS[key],
    value: totals[key],
    fill: EVENT_COLORS[key],
  }));
}

function funnelFromTotals(totals: AnalyticsTotals): AnalyticsFunnelStep[] {
  return [
    {
      step: "Searches",
      value: totals.search,
      fill: EVENT_COLORS.search,
    },
    {
      step: "Listing views",
      value: totals.listing_view,
      fill: EVENT_COLORS.listing_view,
    },
    {
      step: "Enquiries",
      value: totals.enquiry_sent,
      fill: EVENT_COLORS.enquiry_sent,
    },
    {
      step: "Reports",
      value: totals.report_sent,
      fill: EVENT_COLORS.report_sent,
    },
  ];
}

function emptyOps() {
  return {
    publishedListings: 0,
    pendingReview: 0,
    enquiries: 0,
    openReports: 0,
    viewings: 0,
    occupancies: 0,
  };
}

export async function getAnalyticsDashboard(rangeDays = 30): Promise<AnalyticsDashboard> {
  if (!isSupabaseConfigured()) {
    const daily = buildEmptyDaily(rangeDays);
    const totals = emptyTotals();
    return {
      totals,
      daily,
      breakdown: breakdownFromTotals(totals),
      funnel: funnelFromTotals(totals),
      ops: emptyOps(),
      rangeDays,
    };
  }

  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - (rangeDays - 1));
  since.setHours(0, 0, 0, 0);

  const [eventsResult, published, pending, enquiries, reports, viewings, occupancies] =
    await Promise.all([
      supabase
        .from("analytics_events")
        .select("event_name, created_at")
        .gte("created_at", since.toISOString())
        .in("event_name", [...ANALYTICS_EVENT_KEYS])
        .order("created_at", { ascending: true })
        .limit(5000),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review"),
      supabase.from("enquiries").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("viewings").select("id", { count: "exact", head: true }),
      supabase.from("occupancies").select("id", { count: "exact", head: true }),
    ]);

  const daily = buildEmptyDaily(rangeDays);
  const byDate = new Map(daily.map((point) => [point.date, point]));

  for (const row of eventsResult.data ?? []) {
    const key = row.event_name as AnalyticsEventKey;
    if (!ANALYTICS_EVENT_KEYS.includes(key)) continue;
    const date = String(row.created_at).slice(0, 10);
    const point = byDate.get(date);
    if (!point) continue;
    point[key] += 1;
    point.total += 1;
  }

  const totals = totalsFromDaily(daily);

  return {
    totals,
    daily,
    breakdown: breakdownFromTotals(totals),
    funnel: funnelFromTotals(totals),
    ops: {
      publishedListings: published.count ?? 0,
      pendingReview: pending.count ?? 0,
      enquiries: enquiries.count ?? 0,
      openReports: reports.count ?? 0,
      viewings: viewings.count ?? 0,
      occupancies: occupancies.count ?? 0,
    },
    rangeDays,
  };
}
