"use client";

import { Check, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/project-context";
import type { WorkflowStage } from "@/lib/workflow";

interface StatusStepperProps {
  currentStatus: string;
  isBlocked: boolean;
  blockedReason?: string | null;
  onStatusChange: (status: string) => void;
  onBlockToggle: (blocked: boolean, reason?: string) => void;
  /** Override stages (for non-project contexts) */
  stages?: WorkflowStage[];
}

export function StatusStepper({
  currentStatus,
  isBlocked,
  blockedReason,
  onStatusChange,
  onBlockToggle,
  stages: stagesProp,
}: StatusStepperProps) {
  // Try context first, fall back to prop or default
  let stages: WorkflowStage[];
  try {
    const { workflowStages } = useProject();
    stages = stagesProp ?? workflowStages;
  } catch {
    // Not within a ProjectProvider — use prop or defaults
    const { DEFAULT_WORKFLOW_STAGES } = require("@/lib/workflow");
    stages = stagesProp ?? DEFAULT_WORKFLOW_STAGES;
  }

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const currentIndex = sortedStages.findIndex((s) => s.id === currentStatus);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {sortedStages.map((stage, index) => {
          const isCompleted = currentIndex > -1 && index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={stage.id} className="flex items-center">
              <button
                onClick={() => {
                  if (stage.id !== currentStatus) {
                    onStatusChange(stage.id);
                  }
                }}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors whitespace-nowrap",
                  isCompleted && "bg-emerald-100 text-emerald-700",
                  isCurrent && cn(stage.bgClass, stage.textClass, "ring-2 ring-offset-1 ring-current"),
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground hover:bg-accent",
                  isBlocked && isCurrent && "ring-red-400"
                )}
              >
                {isCompleted && <Check className="h-3 w-3" />}
                {isBlocked && isCurrent && <Ban className="h-3 w-3 text-red-500" />}
                {stage.label}
              </button>
              {index < sortedStages.length - 1 && (
                <div
                  className={cn(
                    "h-px w-3 mx-0.5",
                    isCompleted ? "bg-emerald-400" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Blocked flag indicator */}
      {isBlocked ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2.5 py-1 text-xs font-medium ring-2 ring-red-300 ring-offset-1">
            <Ban className="h-3 w-3 mr-1" />
            Blocked
          </span>
          {blockedReason && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={blockedReason}>
              {blockedReason}
            </span>
          )}
          <button
            onClick={() => onBlockToggle(false)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Unblock
          </button>
        </div>
      ) : (
        <button
          onClick={() => onBlockToggle(true)}
          className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
        >
          Mark as blocked
        </button>
      )}
    </div>
  );
}
