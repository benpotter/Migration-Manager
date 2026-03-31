"use client";

import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/constants";
import { Ban } from "lucide-react";
import type { WorkflowStage } from "@/lib/workflow";

interface StatusBadgeProps {
  status: string;
  isBlocked?: boolean;
  className?: string;
  /** Override stages for color/label lookup */
  stages?: WorkflowStage[];
}

export function StatusBadge({ status, isBlocked, className, stages }: StatusBadgeProps) {
  // Look up from stages prop first, then fall back to global STATUS_CONFIG
  let bg: string;
  let text: string;
  let label: string;

  if (stages) {
    const stage = stages.find((s) => s.id === status);
    bg = stage?.bgClass ?? "bg-gray-100";
    text = stage?.textClass ?? "text-gray-700";
    label = stage?.label ?? status;
  } else {
    const config = STATUS_CONFIG[status];
    if (!config) {
      bg = "bg-gray-100";
      text = "text-gray-700";
      label = status;
    } else {
      bg = config.bg;
      text = config.text;
      label = config.label;
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        bg,
        text,
        isBlocked && "ring-2 ring-red-400 ring-offset-1",
        className
      )}
    >
      {isBlocked && <Ban className="h-3 w-3 mr-1 text-red-500" />}
      {label}
    </span>
  );
}
