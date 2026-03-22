"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface InlineRenameProps {
  pageId: string;
  currentName: string;
  projectId: string;
  onDone: (newName?: string) => void;
}

export function InlineRename({
  pageId,
  currentName,
  projectId,
  onDone,
}: InlineRenameProps) {
  const [value, setValue] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === currentName) {
      onDone();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/p/${projectId}/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      toast.success("Page renamed");
      onDone(trimmed);
    } catch {
      toast.error("Failed to rename page");
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") onDone();
      }}
      disabled={saving}
      className="h-6 text-sm px-1 py-0 w-48"
      onClick={(e) => e.stopPropagation()}
    />
  );
}
