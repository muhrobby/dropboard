"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Listens for Background Sync messages from the service worker and surfaces
 * them as persistent bottom toasts.
 *
 * Messages received from sw.js:
 *   { type: "UPLOAD_COMPLETE", id: string, title: string }
 *   { type: "UPLOAD_FAILED",   id: string, title: string }
 */
export function BackgroundUploadListener() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function handleMessage(event: MessageEvent) {
      const { type, title } = event.data ?? {};
      const name = title ? `"${title}"` : "A file";

      if (type === "UPLOAD_COMPLETE") {
        toast.success(`${name} uploaded successfully`, {
          description: "Background upload finished.",
          duration: 5000,
        });
      } else if (type === "UPLOAD_FAILED") {
        toast.error(`Failed to upload ${name}`, {
          description: "The upload could not be completed.",
          duration: 7000,
        });
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}
