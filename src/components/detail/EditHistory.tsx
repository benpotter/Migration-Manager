"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { PageEdit } from "@/types";

interface EditHistoryProps {
  pageId: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function humanizeField(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EditHistory({ pageId }: EditHistoryProps) {
  const [edits, setEdits] = useState<PageEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/pages/${pageId}/history`);
        if (!res.ok) throw new Error("Failed to load history");
        const data = await res.json();
        setEdits(data);
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [pageId]);

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading history...</div>;
  }

  if (edits.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No edit history.</div>;
  }

  const displayEdits = showAll ? edits : edits.slice(0, 20);

  return (
    <div className="p-4 space-y-1">
      {displayEdits.map((edit) => (
        <div
          key={edit.id}
          className="flex gap-3 py-2 border-l-2 border-muted pl-3 ml-3 relative"
        >
          <div className="absolute -left-[5px] top-3 h-2 w-2 rounded-full bg-muted-foreground" />
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className="text-[9px]">
              {getInitials(edit.user?.name ?? null)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{edit.user?.name ?? "Unknown"}</span>{" "}
              changed{" "}
              <span className="font-medium">{humanizeField(edit.field)}</span>
              {edit.old_value && (
                <>
                  {" "}
                  from{" "}
                  <span className="text-muted-foreground line-through">
                    {edit.old_value}
                  </span>
                </>
              )}
              {" "}to{" "}
              <span className="font-medium">{edit.new_value ?? "empty"}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTime(edit.created_at)}
            </p>
          </div>
        </div>
      ))}
      {edits.length > 20 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-sm text-muted-foreground hover:text-foreground underline ml-6"
        >
          Show all {edits.length} entries
        </button>
      )}
    </div>
  );
}
