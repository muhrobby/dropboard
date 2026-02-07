"use client";

import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PinButtonProps = {
  isPinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  disabled?: boolean;
  size?: "default" | "sm" | "icon";
};

export function PinButton({
  isPinned,
  onPin,
  onUnpin,
  disabled = false,
  size = "icon",
}: PinButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          onClick={isPinned ? onUnpin : onPin}
          disabled={disabled}
          className="h-8 w-8"
        >
          {isPinned ? (
            <PinOff className="h-4 w-4" />
          ) : (
            <Pin className="h-4 w-4" />
          )}
          <span className="sr-only">{isPinned ? "Unpin" : "Pin"}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isPinned ? "Unpin (temporary)" : "Pin (permanent)"}
      </TooltipContent>
    </Tooltip>
  );
}
