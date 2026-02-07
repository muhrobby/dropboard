"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
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
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function ActivityChart() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Activity Trend</CardTitle>
        <CardDescription>Actions over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="activity" fill="var(--color-activity)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
