"use client";

import { cn } from "@/lib/utils";

interface DataListLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Data List Layout Pattern
 *
 * Purpose: Tables, lists with filtering and bulk actions.
 *
 * Structure:
 * - PageHeader (title + primary CTA)
 * - Toolbar (search + filters + selection count)
 * - Table/List
 * - Pagination
 * - Bulk action bar (on selection)
 *
 * Mobile: Card list instead of table, swipe actions
 */
export function DataListLayout({ children, className }: DataListLayoutProps) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

interface DataListToolbarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Toolbar - Search, filters, selection info
 */
export function DataListToolbar({ children, className }: DataListToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface DataListFiltersProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Filters container - Left side of toolbar
 */
export function DataListFilters({ children, className }: DataListFiltersProps) {
  return (
    <div className={cn("flex flex-1 items-center gap-2", className)}>
      {children}
    </div>
  );
}

interface DataListActionsProps {
  children: React.ReactNode;
  selectionCount?: number;
  className?: string;
}

/**
 * Actions container - Right side of toolbar
 */
export function DataListActions({
  children,
  selectionCount,
  className,
}: DataListActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {selectionCount !== undefined && selectionCount > 0 && (
        <span className="text-sm text-muted-foreground">
          {selectionCount} selected
        </span>
      )}
      {children}
    </div>
  );
}

interface DataListContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Content wrapper - Table or card list
 */
export function DataListContent({ children, className }: DataListContentProps) {
  return (
    <div className={cn("rounded-lg border bg-card", className)}>{children}</div>
  );
}

interface BulkActionBarProps {
  children: React.ReactNode;
  visible: boolean;
  className?: string;
}

/**
 * Bulk Action Bar - Sticky bottom on selection
 */
export function BulkActionBar({
  children,
  visible,
  className,
}: BulkActionBarProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur p-4",
        "flex items-center justify-between",
        "animate-in slide-in-from-bottom-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
