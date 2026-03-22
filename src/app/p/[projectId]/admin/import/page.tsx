"use client";

import { useState, useEffect } from "react";
import { ExcelUploader } from "@/components/import/ExcelUploader";
import { ImportPreview } from "@/components/import/ImportPreview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/contexts/project-context";
import type { ImportResult } from "@/types";

interface ImportLog {
  id: string;
  filename: string;
  rows_imported: number;
  rows_created: number;
  rows_updated: number;
  rows_archived: number;
  error_count: number;
  created_at: string;
  user_name: string | null;
}

export default function ProjectImportPage() {
  const { projectId } = useProject();
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [projectId]);

  async function fetchLogs() {
    try {
      const res = await fetch(`/api/p/${projectId}/import/logs`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data);
    } catch {
      // Non-critical
    } finally {
      setLoadingLogs(false);
    }
  }

  const handleImportComplete = (result: ImportResult) => {
    setLastResult(result);
    fetchLogs();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Data</h1>
        <p className="text-muted-foreground">
          Upload an Excel spreadsheet to import or update page data
        </p>
      </div>

      <ExcelUploader
        onImportComplete={handleImportComplete}
        projectId={projectId}
      />

      {lastResult && <ImportPreview result={lastResult} />}

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No import history yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="text-right">Imported</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="text-right">Archived</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm font-medium">
                      {log.filename}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.user_name ?? "Unknown"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {log.rows_imported}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {log.rows_created}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {log.rows_updated}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {log.rows_archived}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {log.error_count > 0 ? (
                        <span className="text-destructive">{log.error_count}</span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
