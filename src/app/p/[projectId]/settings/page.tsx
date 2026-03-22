"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/contexts/project-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const PROJECT_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

export default function GeneralSettingsPage() {
  const { project, projectId, isProjectAdmin } = useProject();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(project.name);
  const [clientName, setClientName] = useState(project.client_name ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [slug, setSlug] = useState(project.slug);
  const [color, setColor] = useState(project.color);

  const hasChanges =
    name !== project.name ||
    clientName !== (project.client_name ?? "") ||
    description !== (project.description ?? "") ||
    slug !== project.slug ||
    color !== project.color;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          client_name: clientName.trim() || null,
          description: description.trim() || null,
          slug: slug.trim(),
          color,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Settings saved");
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
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Basic project information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isProjectAdmin}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client">Client Name</Label>
            <Input
              id="client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              disabled={!isProjectAdmin}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={!isProjectAdmin}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="font-mono"
              disabled={!isProjectAdmin}
            />
            {slug !== project.slug && (
              <p className="text-xs text-amber-600">
                Changing the slug will break existing bookmarks
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Project Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => isProjectAdmin && setColor(c)}
                  disabled={!isProjectAdmin}
                  className={`h-7 w-7 rounded-full transition-all ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-primary"
                      : "hover:scale-110"
                  } ${!isProjectAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {isProjectAdmin && hasChanges && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setName(project.name);
                  setClientName(project.client_name ?? "");
                  setDescription(project.description ?? "");
                  setSlug(project.slug);
                  setColor(project.color);
                }}
              >
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
