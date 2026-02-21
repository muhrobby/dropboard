"use client";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // For Primary CTA
  className?: string;
}

/**
 * Page Header - Stripe-like page title with optional CTA
 * Use this at the top of every page for consistent hierarchy
 */
export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="text-base text-muted-foreground/80 max-w-[600px] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex w-full sm:w-auto items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Section Header - For grouping content within a page
 */
export function SectionHeader({
  title,
  description,
  children,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4 mb-6",
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground/80 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex w-full sm:w-auto items-center gap-2 mt-2 sm:mt-0">
          {children}
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Metric Card - For displaying KPIs in overview pattern
 */
export function MetricCard({
  label,
  value,
  change,
  trend,
  icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-center justify-between relative z-10">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && (
          <div className="p-2 bg-primary/5 text-primary rounded-xl group-hover:bg-primary/10 transition-colors">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-1 relative z-10">
        <p className="text-4xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        {change && (
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                trend === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                trend === "down" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                trend === "neutral" && "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
              )}
            >
              {change}
            </span>
          </div>
        )}
      </div>
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.02] pointer-events-none" />
    </div>
  );
}

interface ContentGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * Content Grid - Responsive grid for metric cards
 */
export function ContentGrid({
  children,
  columns = 4,
  className,
}: ContentGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
