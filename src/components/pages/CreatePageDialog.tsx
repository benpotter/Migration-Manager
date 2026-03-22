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
import { Input } from "@/components/ui/input";
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
import type { PageNode, PageStyle, ContentResponsibility } from "@/types";

interface CreatePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  tree: PageNode[];
  defaultParentId?: string | null;
  onCreated: () => void;
}

export function CreatePageDialog({
  open,
  onOpenChange,
  projectId,
  tree,
  defaultParentId = null,
  onCreated,
}: CreatePageDialogProps) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const [pageStyle, setPageStyle] = useState<string>("");
  const [slug, setSlug] = useState("");
  const [contentResponsibility, setContentResponsibility] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  const resetForm = () => {
    setName("");
    setSlug("");
    setPageStyle("");
    setContentResponsibility("");
    // Keep parentId for "add another" flow
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Page name is required");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        parent_page_id: parentId,
      };
      if (pageStyle) body.page_style = pageStyle;
      if (slug.trim()) body.slug = slug.trim();
      if (contentResponsibility) body.content_responsibility = contentResponsibility;

      const res = await fetch(`/api/p/${projectId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create page");
      }

      toast.success(`Created "${name.trim()}"`);
      onCreated();

      if (addAnother) {
        resetForm();
      } else {
        resetForm();
        setParentId(defaultParentId);
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create page");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Page</DialogTitle>
          <DialogDescription>
            Create a new page in this project
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="page-name">Page Name *</Label>
            <Input
              id="page-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. About Us"
              autoFocus
            />
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

          <div className="space-y-1.5">
            <Label htmlFor="page-slug">URL Slug</Label>
            <Input
              id="page-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Auto-generated from name"
              className="font-mono text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={saving || !name.trim()}
              onClick={() => {
                setAddAnother(true);
                // Trigger form submission
                const form = document.querySelector("form");
                form?.requestSubmit();
              }}
            >
              Create & Add Another
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim()}
              onClick={() => setAddAnother(false)}
            >
              {saving ? "Creating..." : "Create Page"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
