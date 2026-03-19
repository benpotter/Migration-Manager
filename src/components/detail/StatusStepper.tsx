"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MIGRATION_STATUSES, STATUS_CONFIG } from "@/lib/constants";
import type { MigrationStatus } from "@/types";

interface StatusStepperProps {
  currentStatus: MigrationStatus;
  onStatusChange: (status: MigrationStatus) => void;
}

export function StatusStepper({
  currentStatus,
  onStatusChange,
}: StatusStepperProps) {
  // Filter out "blocked" from the linear flow
  const linearStatuses = MIGRATION_STATUSES.filter((s) => s !== "blocked");
  const currentIndex = linearStatuses.indexOf(currentStatus as typeof linearStatuses[number]);
  const isBlocked = currentStatus === "blocked";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {linearStatuses.map((status, index) => {
          const config = STATUS_CONFIG[status];
          const isCompleted = !isBlocked && index < currentIndex;
          const isCurrent = !isBlocked && index === currentIndex;

          return (
            <div key={status} className="flex items-center">
              <button
                onClick={() => {
                  if (status !== currentStatus) {
                    onStatusChange(status);
                  }
                }}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors whitespace-nowrap",
                  isCompleted && "bg-emerald-100 text-emerald-700",
                  isCurrent && cn(config?.bg, config?.text, "ring-2 ring-offset-1 ring-current"),
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                {isCompleted && <Check className="h-3 w-3" />}
                {config?.label ?? status}
              </button>
              {index < linearStatuses.length - 1 && (
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
      {isBlocked && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2.5 py-1 text-xs font-medium ring-2 ring-red-300 ring-offset-1">
            Blocked
          </span>
          <button
            onClick={() => onStatusChange("not_started")}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Unblock
          </button>
        </div>
      )}
    </div>
  );
}
