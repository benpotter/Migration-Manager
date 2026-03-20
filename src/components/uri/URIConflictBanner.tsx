"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { URIConflict } from "@/types";

interface URIConflictBannerProps {
  conflicts: URIConflict[];
  showConflictsOnly: boolean;
  onToggleConflictsOnly: () => void;
}

export function URIConflictBanner({
  conflicts,
  showConflictsOnly,
  onToggleConflictsOnly,
}: URIConflictBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (conflicts.length === 0) return null;

  const totalConflictingPages = conflicts.reduce(
    (sum, c) => sum + c.conflictingPages.length,
    0
  );

  return (
    <div className="mx-4 mt-2 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 p-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
        <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
          {conflicts.length} URI conflict{conflicts.length > 1 ? "s" : ""} detected ({totalConflictingPages} pages)
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={showConflictsOnly ? "default" : "outline"}
            size="sm"
            onClick={onToggleConflictsOnly}
            className="h-7 text-xs"
          >
            {showConflictsOnly ? "Show All" : "Show Conflicts Only"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {conflicts.map((conflict, i) => (
            <div
              key={i}
              className="text-xs text-orange-700 dark:text-orange-300 pl-6"
            >
              <span className="font-medium">/{conflict.segment}</span>
              <span className="text-orange-500"> (depth {conflict.depth})</span>
              <span className="text-orange-600"> — </span>
              {conflict.conflictingPages.map((p, j) => (
                <span key={p.pageId}>
                  {j > 0 && ", "}
                  <span className="font-mono">{p.pageId}</span>
                  <span className="text-orange-500"> ({p.name})</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
