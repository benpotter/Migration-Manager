"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Archive } from "lucide-react";
import type { ImportResult } from "@/types";

interface ImportPreviewProps {
  result: ImportResult;
}

export function ImportPreview({ result }: ImportPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Import Results: {result.filename}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 rounded-md border p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <span className="text-sm font-bold text-blue-700">
                {result.rowsImported}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">Total Rows</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border p-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <span className="text-sm font-medium">{result.rowsCreated}</span>
              <span className="text-xs text-muted-foreground ml-1">Created</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border p-3">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <div>
              <span className="text-sm font-medium">{result.rowsUpdated}</span>
              <span className="text-xs text-muted-foreground ml-1">Updated</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border p-3">
            <Archive className="h-5 w-5 text-gray-500" />
            <div>
              <span className="text-sm font-medium">{result.rowsArchived}</span>
              <span className="text-xs text-muted-foreground ml-1">Archived</span>
            </div>
          </div>
        </div>

        {/* Errors */}
        {result.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-destructive">
              Errors ({result.errors.length})
            </h4>
            <div className="rounded-md border border-destructive/20 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead className="w-24">Page ID</TableHead>
                    <TableHead className="w-32">Field</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.errors.slice(0, 50).map((err, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{err.row}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {err.pageId ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs">{err.field}</TableCell>
                      <TableCell className="text-xs text-destructive">
                        {err.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {result.errors.length > 50 && (
                <div className="p-2 text-xs text-muted-foreground text-center border-t">
                  Showing first 50 of {result.errors.length} errors
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
