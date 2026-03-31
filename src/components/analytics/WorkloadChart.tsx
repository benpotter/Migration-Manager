"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PageRow } from "@/types";

const CHART_STATUS_GROUPS = [
  { key: "not_started", label: "Not Started", color: "#9ca3af" },
  { key: "in_progress", label: "In Progress", color: "#3b82f6" },
  { key: "qa", label: "QA", color: "#f97316" },
  { key: "published", label: "Published", color: "#10b981" },
  { key: "blocked", label: "Blocked", color: "#ef4444" },
] as const;

function categorizeStatus(status: string): string {
  if (status === "not_started") return "not_started";
  if (status === "published") return "published";
  if (status.startsWith("qa")) return "qa";
  return "in_progress";
}

interface WorkloadChartProps {
  pages: PageRow[];
}

export function WorkloadChart({ pages }: WorkloadChartProps) {
  const migratorMap = new Map<string, Record<string, number>>();

  for (const page of pages) {
    const migrator = page.migrator || "Unassigned";
    if (!migratorMap.has(migrator)) {
      migratorMap.set(migrator, {
        not_started: 0,
        in_progress: 0,
        qa: 0,
        published: 0,
        blocked: 0,
      });
    }
    const counts = migratorMap.get(migrator)!;
    // Blocked is now a flag, not a status
    if (page.is_blocked) {
      counts["blocked"] = (counts["blocked"] ?? 0) + 1;
    } else {
      const category = categorizeStatus(page.status);
      counts[category] = (counts[category] ?? 0) + 1;
    }
  }

  const data = Array.from(migratorMap.entries())
    .map(([name, counts]) => ({
      name,
      ...counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workload by Migrator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                dataKey="name"
                type="category"
                width={75}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Legend />
              {CHART_STATUS_GROUPS.map((group) => (
                <Bar
                  key={group.key}
                  dataKey={group.key}
                  stackId="a"
                  fill={group.color}
                  name={group.label}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
