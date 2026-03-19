"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface StatusDistributionProps {
  byStatus: Record<MigrationStatus, number>;
}

export function StatusDistribution({ byStatus }: StatusDistributionProps) {
  const data = MIGRATION_STATUSES.filter((s) => (byStatus[s] ?? 0) > 0).map(
    (status) => ({
      name: STATUS_CONFIG[status]?.label ?? status,
      value: byStatus[status] ?? 0,
      status,
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? "#9ca3af"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [String(value), "Pages"]}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value: string) => (
                  <span className="text-xs">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
