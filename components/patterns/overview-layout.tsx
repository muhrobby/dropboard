"use client";

import { cn } from "@/lib/utils";

interface OverviewLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Overview Layout Pattern
 *
 * Purpose: Dashboard home, summary view, key metrics at a glance.
 *
 * Structure:
 * - PageHeader (title + primary CTA)
 * - Metric cards row (3-4 cards)
 * - Two-column content (chart left, activity right)
 *
 * Mobile: Single column, metrics 2x2
 */
export function OverviewLayout({ children, className }: OverviewLayoutProps) {
  return <div className={cn("space-y-8", className)}>{children}</div>;
}

interface OverviewMetricsProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Metrics section - Grid of 4 metric cards
 */
export function OverviewMetrics({ children, className }: OverviewMetricsProps) {
  return (
    <div className={cn("grid gap-4 grid-cols-2 lg:grid-cols-4", className)}>
      {children}
    </div>
  );
}

interface OverviewContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Main content area - Two columns (60/40 split)
 */
export function OverviewContent({ children, className }: OverviewContentProps) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-5", className)}>{children}</div>
  );
}

interface OverviewMainProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Main column (60% - charts/primary content)
 */
export function OverviewMain({ children, className }: OverviewMainProps) {
  return (
    <div className={cn("lg:col-span-3 space-y-6", className)}>{children}</div>
  );
}

interface OverviewSideProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Side column (40% - activity/secondary content)
 */
export function OverviewSide({ children, className }: OverviewSideProps) {
  return (
    <div className={cn("lg:col-span-2 space-y-6", className)}>{children}</div>
  );
}
