"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileSpreadsheet, Pencil, RefreshCw, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { DataMode } from "@/types";
import { WORKFLOW_TEMPLATES, type WorkflowTemplateKey } from "@/lib/workflow";

const PROJECT_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

const DATA_MODES: { value: DataMode; label: string; icon: typeof FileSpreadsheet; description: string }[] = [
  {
    value: "import",
    label: "Import from Excel",
    icon: FileSpreadsheet,
    description: "Upload existing content inventories from spreadsheets",
  },
  {
    value: "direct_entry",
    label: "Direct Entry",
    icon: Pencil,
    description: "Build your information architecture from scratch",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    icon: RefreshCw,
    description: "Import a base, then add and modify pages directly",
  },
];

interface InviteMember {
  email: string;
  role: "admin" | "editor" | "viewer";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [dataMode, setDataMode] = useState<DataMode>("import");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [workflowTemplate, setWorkflowTemplate] = useState<WorkflowTemplateKey>("full_migration");
  const [members, setMembers] = useState<InviteMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [showMembers, setShowMembers] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManual) {
      setSlug(slugify(value));
    }
  };

  const addMember = () => {
    const email = newMemberEmail.trim();
    if (!email) return;
    if (members.some((m) => m.email === email)) {
      toast.error("Email already added");
      return;
    }
    setMembers((prev) => [...prev, { email, role: newMemberRole }]);
    setNewMemberEmail("");
  };

  const removeMember = (email: string) => {
    setMembers((prev) => prev.filter((m) => m.email !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Project name and slug are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          client_name: clientName.trim() || null,
          description: description.trim() || null,
          data_mode: dataMode,
          color,
          settings: {
            workflow: { stages: WORKFLOW_TEMPLATES[workflowTemplate].stages },
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create project");
      }

      const { data: project } = await res.json();

      // Invite members (fire-and-forget, don't block redirect)
      for (const member of members) {
        fetch(`/api/projects/${project.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: member.email, role: member.role }),
        }).catch(() => {
          // Will handle errors in settings later
        });
      }

      toast.success("Project created!");
      router.push(`/p/${project.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Project</h1>
          <p className="text-muted-foreground">
            Set up a new migration project
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Project Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. RCC Website Migration"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client">Client Name</Label>
              <Input
                id="client"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Rogue Community College"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the project..."
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/p/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value));
                    setSlugManual(true);
                  }}
                  placeholder="project-slug"
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Data Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How will content enter this project?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DATA_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = dataMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setDataMode(mode.value)}
                  className={`w-full flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className={`mt-0.5 rounded-full border-2 h-4 w-4 flex items-center justify-center shrink-0 ${
                    isSelected ? "border-primary" : "border-muted-foreground/40"
                  }`}>
                    {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{mode.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {mode.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Section 3: Workflow Template */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow Template</CardTitle>
            <CardDescription>
              Choose a starting workflow. You can customize stages later in project settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.entries(WORKFLOW_TEMPLATES) as [WorkflowTemplateKey, typeof WORKFLOW_TEMPLATES[WorkflowTemplateKey]][]).map(
              ([key, template]) => {
                const isSelected = workflowTemplate === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setWorkflowTemplate(key)}
                    className={`w-full flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className={`mt-0.5 rounded-full border-2 h-4 w-4 flex items-center justify-center shrink-0 ${
                      isSelected ? "border-primary" : "border-muted-foreground/40"
                    }`}>
                      {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{template.label}</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {template.stages.map((stage, i) => (
                          <span
                            key={stage.id}
                            className="inline-flex items-center gap-1 text-[10px]"
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            {stage.label}
                            {i < template.stages.length - 1 && (
                              <span className="text-muted-foreground mx-0.5">&rarr;</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </CardContent>
        </Card>

        {/* Section 4: Team Members */}
        <Card>
          <CardHeader>
            <button
              type="button"
              onClick={() => setShowMembers(!showMembers)}
              className="flex items-center gap-2 w-full text-left"
            >
              <CardTitle className="text-base">
                {showMembers ? "▾" : "▸"} Team Members
              </CardTitle>
              <CardDescription className="ml-auto">Optional</CardDescription>
            </button>
          </CardHeader>
          {showMembers && (
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                You will be added as Admin automatically.
              </p>
              {members.length > 0 && (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.email}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="flex-1 truncate">{member.email}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {member.role}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeMember(member.email)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Separator />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMember();
                    }
                  }}
                  className="flex-1"
                />
                <Select
                  value={newMemberRole}
                  onValueChange={(val) => setNewMemberRole(val as "admin" | "editor" | "viewer")}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={addMember}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Section 4: Color */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Color</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-all ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-primary"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center gap-3 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/projects">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
