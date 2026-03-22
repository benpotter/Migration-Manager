"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ParentPageCombobox } from "./ParentPageCombobox";
import { PAGE_STYLES, CONTENT_RESPONSIBILITIES } from "@/lib/constants";
import { toast } from "sonner";
import type { PageNode } from "@/types";

interface BatchCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  tree: PageNode[];
  defaultParentId?: string | null;
  onCreated: () => void;
}

export function BatchCreateDialog({
  open,
  onOpenChange,
  projectId,
  tree,
  defaultParentId = null,
  onCreated,
}: BatchCreateDialogProps) {
  const [namesText, setNamesText] = useState("");
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const [pageStyle, setPageStyle] = useState<string>("");
  const [contentResponsibility, setContentResponsibility] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const names = namesText
    .split("\n")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  const handleSubmit = async () => {
    if (names.length === 0) {
      toast.error("Enter at least one page name");
      return;
    }

    setSaving(true);
    try {
      const commonFields: Record<string, unknown> = {};
      if (parentId) commonFields.parent_page_id = parentId;
      if (pageStyle) commonFields.page_style = pageStyle;
      if (contentResponsibility) commonFields.content_responsibility = contentResponsibility;

      const res = await fetch(`/api/p/${projectId}/pages/batch-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: names.map((name) => ({ name })),
          commonFields,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create pages");
      }

      const result = await res.json();
      toast.success(`Created ${result.created} pages`);
      onCreated();
      setNamesText("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create pages");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Batch Create Pages</DialogTitle>
          <DialogDescription>
            Enter one page name per line. All pages share the same parent and settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Page Names (one per line)</Label>
            <Textarea
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              placeholder={"About Us\nContact\nPrograms\nAdmissions\nStudent Services"}
              rows={8}
              className="font-mono text-sm"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {names.length} page{names.length !== 1 ? "s" : ""} will be created
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Parent Page</Label>
            <ParentPageCombobox
              tree={tree}
              value={parentId}
              onChange={setParentId}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Page Style</Label>
              <Select value={pageStyle} onValueChange={setPageStyle}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_STYLES.map((style) => (
                    <SelectItem key={style} value={style}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Content Responsibility</Label>
              <Select value={contentResponsibility} onValueChange={setContentResponsibility}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_RESPONSIBILITIES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || names.length === 0}>
            {saving ? "Creating..." : `Create ${names.length} Page${names.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
