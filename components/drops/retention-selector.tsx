"use client";

import { cn } from "@/lib/utils";
import { Clock, Pin } from "lucide-react";

type RetentionSelectorProps = {
  value: "temporary" | "permanent";
  onChange: (value: "temporary" | "permanent") => void;
  disabled?: boolean;
};

export function RetentionSelector({
  value,
  onChange,
  disabled = false,
}: RetentionSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Temporary Option */}
      <button
        type="button"
        onClick={() => onChange("temporary")}
        disabled={disabled}
        className={cn(
          "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
          "hover:border-primary/50 hover:bg-accent/50",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          value === "temporary"
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-muted bg-background",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            value === "temporary"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Clock className="h-5 w-5" />
        </div>
        <div className="text-center">
          <p className="font-medium text-sm">Temporary</p>
          <p className="text-xs text-muted-foreground">7 days</p>
        </div>
        {value === "temporary" && (
          <div className="absolute top-2 right-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
        )}
      </button>

      {/* Permanent Option */}
      <button
        type="button"
        onClick={() => onChange("permanent")}
        disabled={disabled}
        className={cn(
          "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
          "hover:border-primary/50 hover:bg-accent/50",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          value === "permanent"
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-muted bg-background",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            value === "permanent"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Pin className="h-5 w-5" />
        </div>
        <div className="text-center">
          <p className="font-medium text-sm">Permanent</p>
          <p className="text-xs text-muted-foreground">Forever</p>
        </div>
        {value === "permanent" && (
          <div className="absolute top-2 right-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
        )}
      </button>
    </div>
  );
}
