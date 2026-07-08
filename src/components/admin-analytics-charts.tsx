"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  AnalyticsBreakdownItem,
  AnalyticsDayPoint,
  AnalyticsFunnelStep,
} from "@/lib/analytics-types";

const trendConfig = {
  listing_view: {
    label: "Listing views",
    color: "var(--chart-1)",
  },
  search: {
    label: "Searches",
    color: "var(--chart-2)",
  },
  enquiry_sent: {
    label: "Enquiries",
    color: "var(--chart-3)",
  },
  report_sent: {
    label: "Reports",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const breakdownConfig = {
  value: { label: "Events" },
  listing_view: { label: "Listing views", color: "var(--chart-1)" },
  search: { label: "Searches", color: "var(--chart-2)" },
  enquiry_sent: { label: "Enquiries", color: "var(--chart-3)" },
  report_sent: { label: "Reports", color: "var(--chart-4)" },
} satisfies ChartConfig;

const funnelConfig = {
  value: { label: "Count", color: "var(--chart-1)" },
} satisfies ChartConfig;

type AdminAnalyticsChartsProps = {
  daily: AnalyticsDayPoint[];
  breakdown: AnalyticsBreakdownItem[];
  funnel: AnalyticsFunnelStep[];
  rangeDays: number;
};

export function AdminAnalyticsCharts({
  daily,
  breakdown,
  funnel,
  rangeDays,
}: AdminAnalyticsChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Activity trend</CardTitle>
          <CardDescription>
            Privacy-safe events over the last {rangeDays} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="aspect-auto h-72 w-full">
            <AreaChart data={daily} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="listing_view"
                stroke="var(--color-listing_view)"
                fill="var(--color-listing_view)"
                fillOpacity={0.2}
                strokeWidth={2}
                stackId="a"
              />
              <Area
                type="monotone"
                dataKey="search"
                stroke="var(--color-search)"
                fill="var(--color-search)"
                fillOpacity={0.2}
                strokeWidth={2}
                stackId="a"
              />
              <Area
                type="monotone"
                dataKey="enquiry_sent"
                stroke="var(--color-enquiry_sent)"
                fill="var(--color-enquiry_sent)"
                fillOpacity={0.25}
                strokeWidth={2}
                stackId="a"
              />
              <Area
                type="monotone"
                dataKey="report_sent"
                stroke="var(--color-report_sent)"
                fill="var(--color-report_sent)"
                fillOpacity={0.3}
                strokeWidth={2}
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Event mix</CardTitle>
          <CardDescription>Share of tracked events</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={breakdownConfig}
            className="mx-auto aspect-square max-h-72"
          >
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="key" hideLabel />}
              />
              <Pie
                data={breakdown}
                dataKey="value"
                nameKey="key"
                innerRadius={55}
                strokeWidth={2}
              >
                {breakdown.map((item) => (
                  <Cell key={item.key} fill={item.fill} />
                ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="key" />}
                className="-translate-y-1 flex-wrap gap-2"
              />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Conversion funnel</CardTitle>
          <CardDescription>
            Search → view → enquiry → report volume for the selected window
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={funnelConfig} className="aspect-auto h-64 w-full">
            <BarChart
              data={funnel}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="step"
                type="category"
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="value" radius={6}>
                {funnel.map((item) => (
                  <Cell key={item.step} fill={item.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
