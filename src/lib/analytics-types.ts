export const ANALYTICS_EVENT_KEYS = [
  "listing_view",
  "search",
  "enquiry_sent",
  "report_sent",
] as const;

export type AnalyticsEventKey = (typeof ANALYTICS_EVENT_KEYS)[number];

export type AnalyticsTotals = Record<AnalyticsEventKey, number>;

export type AnalyticsDayPoint = {
  date: string;
  label: string;
  listing_view: number;
  search: number;
  enquiry_sent: number;
  report_sent: number;
  total: number;
};

export type AnalyticsBreakdownItem = {
  key: AnalyticsEventKey;
  label: string;
  value: number;
  fill: string;
};

export type AnalyticsFunnelStep = {
  step: string;
  value: number;
  fill: string;
};

export type AnalyticsDashboard = {
  totals: AnalyticsTotals;
  daily: AnalyticsDayPoint[];
  breakdown: AnalyticsBreakdownItem[];
  funnel: AnalyticsFunnelStep[];
  ops: {
    publishedListings: number;
    pendingReview: number;
    enquiries: number;
    openReports: number;
    viewings: number;
    occupancies: number;
  };
  rangeDays: number;
};

export const EVENT_LABELS: Record<AnalyticsEventKey, string> = {
  listing_view: "Listing views",
  search: "Searches",
  enquiry_sent: "Enquiries",
  report_sent: "Reports",
};

export const EVENT_COLORS: Record<AnalyticsEventKey, string> = {
  listing_view: "var(--chart-1)",
  search: "var(--chart-2)",
  enquiry_sent: "var(--chart-3)",
  report_sent: "var(--chart-4)",
};
