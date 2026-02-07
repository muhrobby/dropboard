"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
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
  const storageLimit = FREE_STORAGE_LIMIT_BYTES; // Or dynamic limit if available
  const storageFree = Math.max(0, storageLimit - storageUsed);

  // Data for the chart
  const chartData = React.useMemo(
    () => [
      { browser: "used", visitors: storageUsed, fill: "var(--color-used)" },
      { browser: "free", visitors: storageFree, fill: "var(--color-free)" },
    ],
    [storageUsed, storageFree],
  );

  const chartConfig = {
    visitors: {
      label: "Storage",
    },
    used: {
      label: "Used",
      color: "hsl(var(--primary))",
    },
    free: {
      label: "Free",
      color: "hsl(var(--muted))",
    },
  } satisfies ChartConfig;

  const totalSizeFormatted = React.useMemo(() => {
    return formatBytes(storageLimit, 0);
  }, [storageLimit]);

  const usedSizeFormatted = React.useMemo(() => {
    return formatBytes(storageUsed);
  }, [storageUsed]);

  const percentUsed = Math.round((storageUsed / storageLimit) * 100);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>Storage Usage</CardTitle>
        <CardDescription>Current workspace</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <div className="mx-auto aspect-square max-h-[250px]">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey="visitors"
                nameKey="browser"
                innerRadius={60}
                strokeWidth={5}
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
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm pt-4">
        <div className="flex items-center gap-2 font-medium leading-none">
          {usedSizeFormatted} used of {totalSizeFormatted}
        </div>
        <div className="leading-none text-muted-foreground">
          Upgrade plan for more storage
        </div>
      </CardFooter>
    </Card>
  );
}
