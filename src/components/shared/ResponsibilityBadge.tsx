"use client";

import { cn } from "@/lib/utils";
import type { ContentResponsibility } from "@/types";

interface ResponsibilityBadgeProps {
  responsibility: ContentResponsibility | null;
  label?: string;
  className?: string;
}

export function ResponsibilityBadge({
  responsibility,
  label,
  className,
}: ResponsibilityBadgeProps) {
  if (!responsibility) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        responsibility === "MAC"
          ? "bg-blue-100 text-blue-700"
          : "bg-green-100 text-green-700",
        className
      )}
    >
      {label ? `${label}: ${responsibility}` : responsibility}
    </span>
  );
}
