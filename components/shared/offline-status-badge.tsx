"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Shows a subtle "Offline" badge when the browser loses network connectivity.
 * Disappears automatically when the connection is restored.
 */
export function OfflineStatusBadge() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initialise from current navigator state
    setIsOffline(!navigator.onLine);

    function handleOffline() {
      setIsOffline(true);
    }
    function handleOnline() {
      setIsOffline(false);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <Badge
      variant="secondary"
      className="gap-1.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-medium"
    >
      <WifiOff className="size-3" />
      Offline
    </Badge>
  );
}
