"use client";

import { Badge } from "@/components/ui/badge";

type RetentionBadgeProps = {
  expiresAt: string | null;
  isPinned: boolean;
};

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const expires = new Date(dateStr);
  const diff = expires.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function RetentionBadge({ expiresAt, isPinned }: RetentionBadgeProps) {
  if (isPinned || !expiresAt) {
    return (
      <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400 text-xs">
        Permanent
      </Badge>
    );
  }

  const days = getDaysUntil(expiresAt);

  if (days === 0) {
    return (
      <Badge variant="outline" className="border-red-500/50 text-red-600 dark:text-red-400 text-xs">
        Expires today
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400 text-xs">
      {days}d left
    </Badge>
  );
}
