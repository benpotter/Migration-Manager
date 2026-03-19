"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface InlineEditProps {
  pageId: string;
  field: string;
  value: string | null;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
  onSave?: (newValue: string) => void;
}

export function InlineEdit({
  pageId,
  field,
  value,
  type = "text",
  options = [],
  onSave,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = async (newValue: string) => {
    if (newValue === (value ?? "")) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue || null }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success(`Updated ${field.replace(/_/g, " ")}`);
      onSave?.(newValue);
      setEditing(false);
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => {
          setEditValue(value ?? "");
          setEditing(true);
        }}
        className="text-left text-sm hover:bg-accent px-1 py-0.5 rounded-sm w-full truncate"
      >
        {value || <span className="text-muted-foreground">-</span>}
      </button>
    );
  }

  if (type === "select") {
    return (
      <Select
        value={editValue}
        onValueChange={(val) => {
          setEditValue(val);
          save(val);
        }}
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => save(editValue)}
      onKeyDown={(e) => {
        if (e.key === "Enter") save(editValue);
        if (e.key === "Escape") {
          setEditValue(value ?? "");
          setEditing(false);
        }
      }}
      disabled={saving}
      className="h-7 text-xs"
    />
  );
}
