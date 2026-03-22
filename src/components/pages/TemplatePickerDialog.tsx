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
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, FolderTree, GraduationCap, Building2, Globe, Package } from "lucide-react";
import { PAGE_TEMPLATES, countTemplatePages, flattenTemplate, type PageTemplate } from "@/lib/page-templates";
import { toast } from "sonner";

const TEMPLATE_ICONS: Record<string, typeof FileText> = {
  "empty": Package,
  "basic-website": FileText,
  "academic-program": GraduationCap,
  "department-site": Building2,
  "microsite": Globe,
};

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void;
}

export function TemplatePickerDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: TemplatePickerDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selectedTemplate = PAGE_TEMPLATES.find((t) => t.id === selected);
  const previewPages = selectedTemplate ? flattenTemplate(selectedTemplate.pages) : [];

  const handleCreate = async () => {
    if (!selectedTemplate || selectedTemplate.pages.length === 0) {
      onOpenChange(false);
      return;
    }

    setCreating(true);
    try {
      // Create pages using batch-create API
      // For simplicity, create top-level pages first, then children
      const flat = flattenTemplate(selectedTemplate.pages);
      const topLevel = flat.filter((p) => !p.parentIndex);

      // Create top-level pages
      const res = await fetch(`/api/p/${projectId}/pages/batch-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: topLevel.map((p) => ({ name: p.name })),
          commonFields: {
            page_style: topLevel[0]?.pageStyle ?? null,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create template pages");
      }

      const result = await res.json();
      const createdPages = result.data as { id: string; name: string }[];

      // Create children for each parent
      for (const parent of createdPages) {
        const templateParent = topLevel.find((p) => p.name === parent.name);
        if (!templateParent) continue;

        const children = flat.filter((p) => p.parentIndex === templateParent.index);
        if (children.length === 0) continue;

        await fetch(`/api/p/${projectId}/pages/batch-create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pages: children.map((c) => ({ name: c.name })),
            commonFields: {
              parent_page_id: parent.id,
              page_style: children[0]?.pageStyle ?? null,
            },
          }),
        });
      }

      toast.success(`Created ${flat.length} pages from template`);
      onCreated();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply template");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Start with a pre-built page structure
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          {PAGE_TEMPLATES.map((template) => {
            const Icon = TEMPLATE_ICONS[template.id] || FolderTree;
            const count = countTemplatePages(template.pages);
            const isSelected = selected === template.id;

            return (
              <Card
                key={template.id}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setSelected(template.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {template.description}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-2">
                        {count} page{count !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Preview */}
        {selectedTemplate && previewPages.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview</p>
            <ScrollArea className="h-32 rounded-md border">
              <div className="p-2 space-y-0.5">
                {previewPages.map((page, i) => (
                  <div
                    key={i}
                    className="text-sm"
                    style={{ paddingLeft: `${(page.index.split(".").length - 1) * 16}px` }}
                  >
                    <span className="text-muted-foreground mr-2">{page.index}</span>
                    {page.name}
                    {page.pageStyle && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({page.pageStyle})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !selected}>
            {creating
              ? "Creating..."
              : selected && selectedTemplate?.pages.length === 0
              ? "Start Empty"
              : `Apply Template`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
