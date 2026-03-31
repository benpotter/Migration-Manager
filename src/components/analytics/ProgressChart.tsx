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
import type { WorkflowStage } from "@/lib/workflow";

interface ProgressChartProps {
  byStatus: Record<string, number>;
  totalPages: number;
  stages?: WorkflowStage[];
}

export function ProgressChart({ byStatus, totalPages, stages }: ProgressChartProps) {
  const data = stages
    ? [...stages].sort((a, b) => a.order - b.order).map((stage) => ({
        status: stage.id,
        label: stage.label,
        count: byStatus[stage.id] ?? 0,
        color: stage.color,
      }))
    : MIGRATION_STATUSES.map((status) => ({
        status,
        label: STATUS_CONFIG[status]?.label ?? status,
        count: byStatus[status] ?? 0,
        color: STATUS_CONFIG[status]?.label ? undefined : "#9ca3af",
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
