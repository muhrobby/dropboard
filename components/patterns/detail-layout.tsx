"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface DetailLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Detail Layout Pattern
 *
 * Purpose: Single item view, read-focused.
 *
 * Structure:
 * - Back navigation
 * - Title + status + meta
 * - Two-column: main content (65%), summary sidebar (35%)
 *
 * Mobile: Stacked, summary at top as collapsible
 */
export function DetailLayout({ children, className }: DetailLayoutProps) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

interface DetailBackProps {
  href: string;
  label?: string;
  className?: string;
}

/**
 * Back navigation link
 */
export function DetailBack({
  href,
  label = "Back",
  className,
}: DetailBackProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className={cn("-ml-2", className)}
    >
      <Link href={href}>
        <ChevronLeft className="h-4 w-4 mr-1" />
        {label}
      </Link>
    </Button>
  );
}

interface DetailHeaderProps {
  title: string;
  status?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Detail header with title, status, meta, and actions
 */
export function DetailHeader({
  title,
  status,
  meta,
  actions,
  className,
}: DetailHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {status}
        </div>
        {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

interface DetailContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Two-column content layout (65/35 split)
 */
export function DetailContent({ children, className }: DetailContentProps) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-3", className)}>{children}</div>
  );
}

interface DetailMainProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Main content area (65%)
 */
export function DetailMain({ children, className }: DetailMainProps) {
  return (
    <div className={cn("lg:col-span-2 space-y-6", className)}>{children}</div>
  );
}

interface DetailSidebarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Summary sidebar (35%)
 */
export function DetailSidebar({ children, className }: DetailSidebarProps) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

interface SummaryCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Summary card for key-value pairs
 */
export function SummaryCard({ title, children, className }: SummaryCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      {title && <h3 className="font-medium mb-3">{title}</h3>}
      <dl className="space-y-3 text-sm">{children}</dl>
    </div>
  );
}

interface SummaryItemProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

/**
 * Key-value pair in summary card
 */
export function SummaryItem({ label, value, className }: SummaryItemProps) {
  return (
    <div className={cn("flex justify-between", className)}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
