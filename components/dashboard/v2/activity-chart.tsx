"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
  { day: "Mon", activity: 12 },
  { day: "Tue", activity: 18 },
  { day: "Wed", activity: 5 },
  { day: "Thu", activity: 25 },
  { day: "Fri", activity: 15 },
  { day: "Sat", activity: 8 },
  { day: "Sun", activity: 3 },
];

const chartConfig = {
  activity: {
    label: "Activities",
    color: "#2563EB", // Explicit Blue Color
  },
} satisfies ChartConfig;

export function ActivityChart() {
  return (
    <Card className="flex flex-col h-full w-full overflow-hidden">
      <CardHeader>
        <CardTitle>Activity Trend</CardTitle>
        <CardDescription>Actions over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4 min-h-[200px]">
        {/* Enforce height on the container to prevent overflow */}
        <div className="h-[200px] w-full">
          <ChartContainer
            config={chartConfig}
            className="h-full w-full aspect-auto"
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="#e5e7eb"
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <ChartTooltip
                cursor={{ fill: "rgba(0,0,0,0.05)" }}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar
                dataKey="activity"
                fill="var(--color-activity)"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
