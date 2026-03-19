"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MIGRATION_STATUSES, STATUS_CONFIG } from "@/lib/constants";
import type { MigrationStatus } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  not_started: "#9ca3af",
  content_drafting: "#3b82f6",
  content_review: "#eab308",
  content_approved: "#22c55e",
  migration_in_progress: "#a855f7",
  migration_complete: "#6366f1",
  qa_design: "#f97316",
  qa_content: "#f59e0b",
  qa_links: "#14b8a6",
  published: "#10b981",
  blocked: "#ef4444",
};

interface ProgressChartProps {
  byStatus: Record<MigrationStatus, number>;
  totalPages: number;
}

export function ProgressChart({ byStatus, totalPages }: ProgressChartProps) {
  const data = MIGRATION_STATUSES.map((status) => ({
    status,
    label: STATUS_CONFIG[status]?.label ?? status,
    count: byStatus[status] ?? 0,
    color: STATUS_COLORS[status],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Migration Pipeline</CardTitle>
        <CardDescription>
          Pages at each stage of the migration workflow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => [String(value), "Pages"]}
              />
              <Bar dataKey="count" name="Pages at stage">
                {data.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
