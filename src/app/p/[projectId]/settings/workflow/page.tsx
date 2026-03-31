"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/contexts/project-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GripVertical, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import type { WorkflowStage } from "@/lib/workflow";
import { WORKFLOW_TEMPLATES, type WorkflowTemplateKey } from "@/lib/workflow";

const PHASE_OPTIONS = [
  { value: "content", label: "Content" },
  { value: "migration", label: "Migration" },
  { value: "qa", label: "QA" },
  { value: "complete", label: "Complete" },
] as const;

const STAGE_COLORS = [
  "#9ca3af", "#3b82f6", "#eab308", "#22c55e", "#a855f7",
  "#6366f1", "#f97316", "#f59e0b", "#14b8a6", "#10b981",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16", "#8b5cf6",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

// Map color hex to Tailwind bg/text classes
function colorToClasses(hex: string): { bgClass: string; textClass: string } {
  const map: Record<string, { bgClass: string; textClass: string }> = {
    "#9ca3af": { bgClass: "bg-gray-100", textClass: "text-gray-700" },
    "#3b82f6": { bgClass: "bg-blue-100", textClass: "text-blue-700" },
    "#eab308": { bgClass: "bg-yellow-100", textClass: "text-yellow-700" },
    "#22c55e": { bgClass: "bg-green-100", textClass: "text-green-700" },
    "#a855f7": { bgClass: "bg-purple-100", textClass: "text-purple-700" },
    "#6366f1": { bgClass: "bg-indigo-100", textClass: "text-indigo-700" },
    "#f97316": { bgClass: "bg-orange-100", textClass: "text-orange-700" },
    "#f59e0b": { bgClass: "bg-amber-100", textClass: "text-amber-700" },
    "#14b8a6": { bgClass: "bg-teal-100", textClass: "text-teal-700" },
    "#10b981": { bgClass: "bg-emerald-100", textClass: "text-emerald-700" },
    "#ef4444": { bgClass: "bg-red-100", textClass: "text-red-700" },
    "#ec4899": { bgClass: "bg-pink-100", textClass: "text-pink-700" },
    "#06b6d4": { bgClass: "bg-cyan-100", textClass: "text-cyan-700" },
    "#84cc16": { bgClass: "bg-lime-100", textClass: "text-lime-700" },
    "#8b5cf6": { bgClass: "bg-violet-100", textClass: "text-violet-700" },
  };
  return map[hex] ?? { bgClass: "bg-gray-100", textClass: "text-gray-700" };
}

export default function WorkflowSettingsPage() {
  const { project, projectId, isProjectAdmin, workflowStages: currentStages } = useProject();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<WorkflowStage[]>(() =>
    [...currentStages].sort((a, b) => a.order - b.order)
  );

  // Dialog for reassigning pages when removing a stage
  const [removeDialog, setRemoveDialog] = useState<{
    stageIndex: number;
    reassignTo: string;
  } | null>(null);

  const hasChanges = JSON.stringify(stages) !== JSON.stringify(
    [...currentStages].sort((a, b) => a.order - b.order)
  );

  const addStage = () => {
    const maxOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.order)) : -1;
    const newStage: WorkflowStage = {
      id: `stage_${Date.now()}`,
      label: "New Stage",
      color: STAGE_COLORS[stages.length % STAGE_COLORS.length],
      bgClass: "bg-gray-100",
      textClass: "text-gray-700",
      order: maxOrder + 1,
      phase: "content",
    };
    setStages([...stages, newStage]);
  };

  const updateStage = (index: number, updates: Partial<WorkflowStage>) => {
    setStages((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const updated = { ...s, ...updates };
        // Auto-update id when label changes (only for new stages)
        if (updates.label && s.id.startsWith("stage_")) {
          updated.id = slugify(updates.label);
        }
        // Auto-update classes when color changes
        if (updates.color) {
          const classes = colorToClasses(updates.color);
          updated.bgClass = classes.bgClass;
          updated.textClass = classes.textClass;
        }
        return updated;
      })
    );
  };

  const requestRemoveStage = (index: number) => {
    if (stages.length <= 2) {
      toast.error("Workflow must have at least 2 stages");
      return;
    }
    // Default reassign to first stage that isn't the one being removed
    const reassignTo = stages.find((_, i) => i !== index)?.id ?? stages[0].id;
    setRemoveDialog({ stageIndex: index, reassignTo });
  };

  const confirmRemoveStage = async () => {
    if (!removeDialog) return;
    const { stageIndex, reassignTo } = removeDialog;
    const removedStage = stages[stageIndex];

    // Reassign pages at this stage
    try {
      const res = await fetch(`/api/p/${projectId}/pages/batch`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: { status: removedStage.id },
          updates: { status: reassignTo },
        }),
      });
      // It's OK if no pages matched
    } catch {
      // Non-critical
    }

    const newStages = stages
      .filter((_, i) => i !== stageIndex)
      .map((s, i) => ({ ...s, order: i }));
    setStages(newStages);
    setRemoveDialog(null);
    toast.success(`Removed "${removedStage.label}" stage`);
  };

  const moveStage = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;
    const newStages = [...stages];
    [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];
    setStages(newStages.map((s, i) => ({ ...s, order: i })));
  };

  const applyTemplate = (key: WorkflowTemplateKey) => {
    const template = WORKFLOW_TEMPLATES[key];
    setStages([...template.stages].map((s, i) => ({ ...s, order: i })));
    toast.success(`Applied "${template.label}" template`);
  };

  const handleSave = async () => {
    if (stages.length < 2) {
      toast.error("Workflow must have at least 2 stages");
      return;
    }

    // Check for duplicate IDs
    const ids = stages.map((s) => s.id);
    if (new Set(ids).size !== ids.length) {
      toast.error("Stage IDs must be unique");
      return;
    }

    setSaving(true);
    try {
      const settings = { ...project.settings, workflow: { stages } };
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Workflow saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Stages</CardTitle>
          <CardDescription>
            Define the stages pages move through in this project. Drag to reorder, or use the arrow buttons.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Templates:</span>
            {(Object.entries(WORKFLOW_TEMPLATES) as [WorkflowTemplateKey, typeof WORKFLOW_TEMPLATES[WorkflowTemplateKey]][]).map(
              ([key, template]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => applyTemplate(key)}
                  disabled={!isProjectAdmin}
                >
                  {template.label}
                </Button>
              )
            )}
          </div>

          {/* Stage list */}
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <div
                key={stage.id + index}
                className="flex items-center gap-2 rounded-lg border p-3 bg-background"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                {/* Order buttons */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveStage(index, "up")}
                    disabled={index === 0 || !isProjectAdmin}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveStage(index, "down")}
                    disabled={index === stages.length - 1 || !isProjectAdmin}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Color picker */}
                <div className="relative shrink-0">
                  <div
                    className="h-6 w-6 rounded-full border cursor-pointer"
                    style={{ backgroundColor: stage.color }}
                  />
                  <input
                    type="color"
                    value={stage.color}
                    onChange={(e) => updateStage(index, { color: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={!isProjectAdmin}
                  />
                </div>

                {/* Label */}
                <Input
                  value={stage.label}
                  onChange={(e) => updateStage(index, { label: e.target.value })}
                  className="h-8 flex-1 min-w-[120px]"
                  disabled={!isProjectAdmin}
                />

                {/* ID (read-only for existing, editable for new) */}
                <span className="text-[10px] text-muted-foreground font-mono w-[120px] truncate shrink-0" title={stage.id}>
                  {stage.id}
                </span>

                {/* Phase */}
                <Select
                  value={stage.phase}
                  onValueChange={(val) => updateStage(index, { phase: val as WorkflowStage["phase"] })}
                  disabled={!isProjectAdmin}
                >
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHASE_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Remove */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => requestRemoveStage(index)}
                  disabled={!isProjectAdmin || stages.length <= 2}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add stage */}
          {isProjectAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={addStage}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Stage
            </Button>
          )}

          {/* Save/Discard */}
          {isProjectAdmin && hasChanges && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setStages([...currentStages].sort((a, b) => a.order - b.order))
                }
              >
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Workflow"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove stage confirmation dialog */}
      <Dialog open={!!removeDialog} onOpenChange={() => setRemoveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Stage</DialogTitle>
            <DialogDescription>
              Pages currently at &ldquo;{removeDialog ? stages[removeDialog.stageIndex]?.label : ""}&rdquo;
              will be reassigned. Choose the target stage:
            </DialogDescription>
          </DialogHeader>
          <Select
            value={removeDialog?.reassignTo ?? ""}
            onValueChange={(val) =>
              setRemoveDialog((prev) => prev ? { ...prev, reassignTo: val } : null)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select stage..." />
            </SelectTrigger>
            <SelectContent>
              {stages
                .filter((_, i) => i !== removeDialog?.stageIndex)
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemoveStage}>
              Remove & Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
