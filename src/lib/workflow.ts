// ── Workflow Stage Types & Utilities ────────────────────
// Centralized workflow configuration that supports per-project customization.
// Components should read stages from ProjectContext, not from hardcoded constants.

export interface WorkflowStage {
  id: string;        // snake_case key, e.g. "content_review"
  label: string;     // Display name, e.g. "Content Review"
  color: string;     // Hex color for charts/badges
  bgClass: string;   // Tailwind bg class
  textClass: string; // Tailwind text class
  order: number;     // Sort order in pipeline
  phase: "content" | "migration" | "qa" | "complete";
}

export interface WorkflowConfig {
  stages: WorkflowStage[];
}

// ── Default Workflow (Full Migration) ──────────────────
// This is the current RCC workflow minus "blocked" (now a flag).
export const DEFAULT_WORKFLOW_STAGES: WorkflowStage[] = [
  { id: "not_started",           label: "Not Started",      color: "#9ca3af", bgClass: "bg-gray-100",    textClass: "text-gray-700",    order: 0, phase: "content" },
  { id: "content_drafting",      label: "Drafting",         color: "#3b82f6", bgClass: "bg-blue-100",    textClass: "text-blue-700",    order: 1, phase: "content" },
  { id: "content_review",        label: "In Review",        color: "#eab308", bgClass: "bg-yellow-100",  textClass: "text-yellow-700",  order: 2, phase: "content" },
  { id: "content_approved",      label: "Approved",         color: "#22c55e", bgClass: "bg-green-100",   textClass: "text-green-700",   order: 3, phase: "content" },
  { id: "migration_in_progress", label: "Migrating",        color: "#a855f7", bgClass: "bg-purple-100",  textClass: "text-purple-700",  order: 4, phase: "migration" },
  { id: "migration_complete",    label: "Migrated",         color: "#6366f1", bgClass: "bg-indigo-100",  textClass: "text-indigo-700",  order: 5, phase: "migration" },
  { id: "qa_design",             label: "Design QA",        color: "#f97316", bgClass: "bg-orange-100",  textClass: "text-orange-700",  order: 6, phase: "qa" },
  { id: "qa_content",            label: "Content QA",       color: "#f59e0b", bgClass: "bg-amber-100",   textClass: "text-amber-700",   order: 7, phase: "qa" },
  { id: "qa_links",              label: "Link QA",          color: "#14b8a6", bgClass: "bg-teal-100",    textClass: "text-teal-700",    order: 8, phase: "qa" },
  { id: "published",             label: "Published",        color: "#10b981", bgClass: "bg-emerald-100", textClass: "text-emerald-700", order: 9, phase: "complete" },
];

// ── Workflow Templates ─────────────────────────────────
export const WORKFLOW_TEMPLATES = {
  full_migration: {
    label: "Full Migration",
    description: "10-stage workflow for comprehensive website migrations",
    stages: DEFAULT_WORKFLOW_STAGES,
  },
  simple_migration: {
    label: "Simple Migration",
    description: "4-stage streamlined workflow",
    stages: [
      { id: "not_started",  label: "Not Started",  color: "#9ca3af", bgClass: "bg-gray-100",    textClass: "text-gray-700",    order: 0, phase: "content" as const },
      { id: "in_progress",  label: "In Progress",  color: "#3b82f6", bgClass: "bg-blue-100",    textClass: "text-blue-700",    order: 1, phase: "migration" as const },
      { id: "qa",           label: "QA",            color: "#f97316", bgClass: "bg-orange-100",  textClass: "text-orange-700",  order: 2, phase: "qa" as const },
      { id: "published",    label: "Published",     color: "#10b981", bgClass: "bg-emerald-100", textClass: "text-emerald-700", order: 3, phase: "complete" as const },
    ],
  },
  content_only: {
    label: "Content Only",
    description: "4-stage workflow for content creation projects",
    stages: [
      { id: "not_started", label: "Not Started", color: "#9ca3af", bgClass: "bg-gray-100",    textClass: "text-gray-700",    order: 0, phase: "content" as const },
      { id: "drafting",    label: "Drafting",     color: "#3b82f6", bgClass: "bg-blue-100",    textClass: "text-blue-700",    order: 1, phase: "content" as const },
      { id: "review",      label: "Review",       color: "#eab308", bgClass: "bg-yellow-100",  textClass: "text-yellow-700",  order: 2, phase: "content" as const },
      { id: "approved",    label: "Approved",     color: "#22c55e", bgClass: "bg-green-100",   textClass: "text-green-700",   order: 3, phase: "complete" as const },
    ],
  },
} as const;

export type WorkflowTemplateKey = keyof typeof WORKFLOW_TEMPLATES;

// ── Helpers ────────────────────────────────────────────

/** Read workflow stages from a project's settings, falling back to default */
export function getWorkflowStages(projectSettings?: Record<string, unknown>): WorkflowStage[] {
  const workflow = projectSettings?.workflow as WorkflowConfig | undefined;
  if (workflow?.stages && Array.isArray(workflow.stages) && workflow.stages.length > 0) {
    return workflow.stages;
  }
  return DEFAULT_WORKFLOW_STAGES;
}

/** Look up a single stage by its ID */
export function getStageById(stages: WorkflowStage[], stageId: string): WorkflowStage | undefined {
  return stages.find((s) => s.id === stageId);
}

/** Get the next stage in the workflow (returns undefined if at the end) */
export function getNextStage(stages: WorkflowStage[], currentStageId: string): WorkflowStage | undefined {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const currentIndex = sorted.findIndex((s) => s.id === currentStageId);
  if (currentIndex === -1 || currentIndex >= sorted.length - 1) return undefined;
  return sorted[currentIndex + 1];
}

/** Get the previous stage in the workflow */
export function getPrevStage(stages: WorkflowStage[], currentStageId: string): WorkflowStage | undefined {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const currentIndex = sorted.findIndex((s) => s.id === currentStageId);
  if (currentIndex <= 0) return undefined;
  return sorted[currentIndex - 1];
}

/** Get stages grouped by phase */
export function getStagesByPhase(stages: WorkflowStage[]): Record<string, WorkflowStage[]> {
  const grouped: Record<string, WorkflowStage[]> = {};
  for (const stage of stages) {
    if (!grouped[stage.phase]) grouped[stage.phase] = [];
    grouped[stage.phase].push(stage);
  }
  return grouped;
}

/** Get the "last" stage (typically "published" or equivalent) */
export function getFinalStage(stages: WorkflowStage[]): WorkflowStage {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  return sorted[sorted.length - 1];
}

/** Check if a stage ID is the final stage */
export function isFinalStage(stages: WorkflowStage[], stageId: string): boolean {
  return getFinalStage(stages).id === stageId;
}

/** Build a STATUS_CONFIG-compatible lookup from workflow stages */
export function buildStatusConfig(stages: WorkflowStage[]): Record<string, { bg: string; text: string; label: string; order: number }> {
  const config: Record<string, { bg: string; text: string; label: string; order: number }> = {};
  for (const stage of stages) {
    config[stage.id] = {
      bg: stage.bgClass,
      text: stage.textClass,
      label: stage.label,
      order: stage.order,
    };
  }
  return config;
}

/** Build a hex color lookup from workflow stages (for charts) */
export function buildStatusColors(stages: WorkflowStage[]): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const stage of stages) {
    colors[stage.id] = stage.color;
  }
  return colors;
}
