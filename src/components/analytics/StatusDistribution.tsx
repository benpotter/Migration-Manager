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
import type { WorkflowStage } from "@/lib/workflow";

interface StatusDistributionProps {
  byStatus: Record<string, number>;
  stages?: WorkflowStage[];
}

export function StatusDistribution({ byStatus, stages }: StatusDistributionProps) {
  const data = stages
    ? [...stages]
        .sort((a, b) => a.order - b.order)
        .filter((s) => (byStatus[s.id] ?? 0) > 0)
        .map((stage) => ({
          name: stage.label,
          value: byStatus[stage.id] ?? 0,
          status: stage.id,
          color: stage.color,
        }))
    : MIGRATION_STATUSES.filter((s) => (byStatus[s] ?? 0) > 0).map(
        (status) => ({
          name: STATUS_CONFIG[status]?.label ?? status,
          value: byStatus[status] ?? 0,
          status,
          color: STATUS_CONFIG[status]?.label ? "#9ca3af" : "#9ca3af",
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
                    fill={entry.color}
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
