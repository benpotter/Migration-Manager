"use client";

import { cn } from "@/lib/utils";
import { Ban } from "lucide-react";
import type { WorkflowStage } from "@/lib/workflow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PipelineSummaryProps {
  stages: WorkflowStage[];
  counts: Record<string, number>;
  blockedCount: number;
  total: number;
  onFilterStatus: (status: string) => void;
  onFilterBlocked: () => void;
}

export function PipelineSummary({
  stages,
  counts,
  blockedCount,
  total,
  onFilterStatus,
  onFilterBlocked,
}: PipelineSummaryProps) {
  if (total === 0) return null;

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-2">
        {/* Stacked bar */}
        <div className="flex flex-1 h-8 rounded-md overflow-hidden">
          {sortedStages.map((stage) => {
            const count = counts[stage.id] ?? 0;
            if (count === 0) return null;
            const pct = (count / total) * 100;

            return (
              <Tooltip key={stage.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onFilterStatus(stage.id)}
                    className="h-full transition-opacity hover:opacity-80 relative group"
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      backgroundColor: stage.color,
                    }}
                  >
                    {pct > 8 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white drop-shadow-sm">
                        {count}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium">{stage.label}: {count} ({Math.round(pct)}%)</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Blocked count (separate) */}
        {blockedCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onFilterBlocked}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 h-8",
                  "bg-red-100 text-red-700 text-xs font-medium",
                  "hover:bg-red-200 transition-colors"
                )}
              >
                <Ban className="h-3 w-3" />
                {blockedCount}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-medium">{blockedCount} blocked page(s)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Legend summary */}
        <div className="text-xs text-muted-foreground ml-2 shrink-0">
          {total} total
        </div>
      </div>
    </TooltipProvider>
  );
}
