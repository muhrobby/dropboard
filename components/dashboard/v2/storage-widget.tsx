"use client";

import { useWorkspaceStore } from "@/stores/workspace-store";
import { FREE_STORAGE_LIMIT_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StorageWidget() {
  const workspace = useWorkspaceStore((s) => s.getActiveWorkspace());

  const storageUsed = workspace?.storageUsedBytes ?? 0;
  const storagePercent = Math.min(
    100,
    Math.round((storageUsed / FREE_STORAGE_LIMIT_BYTES) * 100),
  );

  // Calculate circumference for SVG circle
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (storagePercent / 100) * circumference;

  const colorClass =
    storagePercent > 90
      ? "text-destructive"
      : storagePercent > 75
        ? "text-yellow-500"
        : "text-primary";

  return (
    <Card className="col-span-1 h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">Storage Usage</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-2">
        <div className="relative h-48 w-48 flex items-center justify-center">
          {/* Background Circle */}
          <svg
            className="h-full w-full -rotate-90 transform"
            viewBox="0 0 160 160"
          >
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="12"
              className="text-muted/20"
            />
            {/* Progress Circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-1000 ease-out ${colorClass}`}
            />
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${colorClass}`}>
              {storagePercent}%
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
              Used
            </span>
          </div>
        </div>

        <div className="mt-4 text-center space-y-1">
          <p className="text-sm font-medium">
            {formatBytes(storageUsed)} of{" "}
            {formatBytes(FREE_STORAGE_LIMIT_BYTES)}
          </p>
          <div className="text-xs text-muted-foreground flex gap-4 justify-center mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Files</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted" />
              <span>Free</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
