"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/contexts/project-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { DataMode } from "@/types";

const MODE_INFO: Record<DataMode, { label: string; icon: typeof FileSpreadsheet; description: string }> = {
  import: {
    label: "Import from Excel",
    icon: FileSpreadsheet,
    description: "Upload existing content inventories from spreadsheets. Page creation UI is hidden.",
  },
  direct_entry: {
    label: "Direct Entry",
    icon: Pencil,
    description: "Build your information architecture from scratch. Import UI is hidden.",
  },
  hybrid: {
    label: "Hybrid",
    icon: RefreshCw,
    description: "Import a base, then add and modify pages directly. All features available.",
  },
};

// Transition rules: which modes can switch to which
const ALLOWED_TRANSITIONS: Record<DataMode, DataMode[]> = {
  import: ["hybrid"],
  direct_entry: ["hybrid"],
  hybrid: ["import", "direct_entry"],
};

const TRANSITION_WARNINGS: Record<string, string> = {
  "hybrid→import": "Direct-entry pages will remain, but the page creation UI will be hidden.",
  "hybrid→direct_entry": "The import UI will be hidden. Existing imported data will remain.",
};

export default function DataModeSettingsPage() {
  const { project, projectId, isProjectAdmin, dataMode } = useProject();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [pendingMode, setPendingMode] = useState<DataMode | null>(null);

  const currentInfo = MODE_INFO[dataMode];
  const CurrentIcon = currentInfo.icon;
  const allowed = ALLOWED_TRANSITIONS[dataMode];

  const handleSwitch = async (newMode: DataMode) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data_mode: newMode }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      toast.success(`Switched to ${MODE_INFO[newMode].label}`);
      setPendingMode(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Data Mode</CardTitle>
          <CardDescription>
            Controls how content enters this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <CurrentIcon className="h-5 w-5 mt-0.5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentInfo.label}</span>
                <Badge variant="secondary" className="text-xs">Current</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {currentInfo.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isProjectAdmin && allowed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Switch Data Mode</CardTitle>
            <CardDescription>
              Available transitions from {currentInfo.label}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {allowed.map((mode) => {
              const info = MODE_INFO[mode];
              const Icon = info.icon;
              const warningKey = `${dataMode}→${mode}`;
              const warning = TRANSITION_WARNINGS[warningKey];
              const isPending = pendingMode === mode;

              return (
                <div key={mode} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-medium text-sm">{info.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {info.description}
                      </p>
                    </div>
                    {!isPending ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPendingMode(mode)}
                      >
                        Switch
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPendingMode(null)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                  {isPending && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-md p-3 space-y-2">
                      {warning && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          {warning}
                        </p>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleSwitch(mode)}
                        disabled={saving}
                      >
                        {saving ? "Switching..." : `Confirm switch to ${info.label}`}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Explanation for unavailable transitions */}
            {Object.keys(MODE_INFO)
              .filter((m) => m !== dataMode && !allowed.includes(m as DataMode))
              .map((mode) => {
                const info = MODE_INFO[mode as DataMode];
                const Icon = info.icon;
                return (
                  <div key={mode} className="rounded-lg border p-4 opacity-50">
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-medium text-sm">{info.label}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Switch to Hybrid first, then to {info.label}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
