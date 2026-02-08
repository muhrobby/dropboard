"use client";

import { cn } from "@/lib/utils";

interface SettingsLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Settings Layout Pattern
 *
 * Purpose: Preferences, toggles, configuration.
 *
 * Structure:
 * - PageHeader
 * - Grouped settings in cards
 * - Danger zone at bottom
 *
 * Mobile: Full-width cards, same structure
 */
export function SettingsLayout({ children, className }: SettingsLayoutProps) {
  return <div className={cn("space-y-8", className)}>{children}</div>;
}

interface SettingsGroupProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
  className?: string;
}

/**
 * Settings group - Card with grouped settings
 */
export function SettingsGroup({
  title,
  description,
  children,
  danger = false,
  className,
}: SettingsGroupProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card",
        danger && "border-destructive/50",
        className,
      )}
    >
      <div className="px-6 py-4 border-b">
        <h2 className={cn("font-semibold", danger && "text-destructive")}>
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

interface SettingsRowProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Settings row - Single setting with action
 */
export function SettingsRow({
  title,
  description,
  children,
  className,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-6 py-4 gap-4",
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

interface SettingsFieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Settings field - For inputs that need more space
 */
export function SettingsField({
  label,
  description,
  children,
  className,
}: SettingsFieldProps) {
  return (
    <div className={cn("px-6 py-4 space-y-3", className)}>
      <div>
        <label className="font-medium text-sm">{label}</label>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
