"use client";

import { cn } from "@/lib/utils";

interface EditorLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Editor/Form Layout Pattern
 *
 * Purpose: Create/edit forms with validation.
 *
 * Structure:
 * - PageHeader (title + close)
 * - Sectioned form
 * - Sticky action bar at bottom
 *
 * Mobile: Full-width inputs, sticky footer maintained
 */
export function EditorLayout({ children, className }: EditorLayoutProps) {
  return (
    <div className={cn("min-h-screen flex flex-col", className)}>
      {children}
    </div>
  );
}

interface EditorHeaderProps {
  title: string;
  onClose?: () => void;
  className?: string;
}

/**
 * Editor header with title and close button
 */
export function EditorHeader({ title, onClose, className }: EditorHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b bg-background px-6 py-4",
        className,
      )}
    >
      <h1 className="text-lg font-semibold">{title}</h1>
      {onClose && (
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

interface EditorContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Scrollable content area
 */
export function EditorContent({ children, className }: EditorContentProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto", className)}>
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">{children}</div>
    </div>
  );
}

interface EditorSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Form section with title and description
 */
export function EditorSection({
  title,
  description,
  children,
  className,
}: EditorSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface EditorFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Sticky footer with actions
 */
export function EditorFooter({ children, className }: EditorFooterProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 border-t bg-background/95 backdrop-blur",
        "px-6 py-4",
        className,
      )}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-end gap-3">
        {children}
      </div>
    </div>
  );
}
