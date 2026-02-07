"use client";

import * as React from "react";
import { Label, Pie, PieChart, ResponsiveContainer, Cell } from "recharts";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { FREE_STORAGE_LIMIT_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function StorageWidget() {
  const workspace = useWorkspaceStore((s) => s.getActiveWorkspace());
  const storageUsed = workspace?.storageUsedBytes ?? 0;
  const storageLimit = FREE_STORAGE_LIMIT_BYTES;
  const storageFree = Math.max(0, storageLimit - storageUsed);

  // Explicit colors to avoid black chart issue
  const USAGE_COLOR = "#2563EB"; // Blue-600
  const FREE_COLOR = "#E5E7EB"; // Gray-200

  // Data for the chart
  const chartData = React.useMemo(
    () => [
      { name: "used", value: storageUsed, fill: USAGE_COLOR },
      { name: "free", value: storageFree, fill: FREE_COLOR },
    ],
    [storageUsed, storageFree],
  );

  const chartConfig = {
    visitors: {
      label: "Storage",
    },
    used: {
      label: "Used",
      color: USAGE_COLOR,
    },
    free: {
      label: "Free",
      color: FREE_COLOR,
    },
  } satisfies ChartConfig;

  const totalSizeFormatted = React.useMemo(() => {
    return formatBytes(storageLimit, 0);
  }, [storageLimit]);

  const usedSizeFormatted = React.useMemo(() => {
    return formatBytes(storageUsed);
  }, [storageUsed]);

  // Handle division by zero
  const percentUsed =
    storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="items-center pb-0">
        <CardTitle>Storage Usage</CardTitle>
        <CardDescription>Current workspace</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 min-h-[250px] relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-[200px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false} // Pie chart usually doesn't need cursor, or transparency
                content={
                  <ChartTooltipContent
                    hideLabel
                    className="bg-popover text-popover-foreground shadow-xl border border-border"
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={80}
                strokeWidth={0} // Remove stroke to prevent outline artifacts
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {percentUsed}%
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground text-xs"
                          >
                            Used
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
                {/* Add Cells explicitly for color control */}
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm pt-4 pb-6 z-10 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          {usedSizeFormatted} used of {totalSizeFormatted}
        </div>
        <div className="leading-none text-muted-foreground text-xs">
          Upgrade plan for more storage
        </div>
      </CardFooter>
    </Card>
  );
}
