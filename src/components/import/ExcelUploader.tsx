"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { ImportResult } from "@/types";

interface ExcelUploaderProps {
  onImportComplete: (result: ImportResult) => void;
}

export function ExcelUploader({ onImportComplete }: ExcelUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): boolean => {
    if (
      !f.name.endsWith(".xlsx") &&
      !f.name.endsWith(".xls")
    ) {
      toast.error("Invalid file type. Please upload an Excel file (.xlsx)");
      return false;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return false;
    }
    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && validateFile(dropped)) {
      setFile(dropped);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && validateFile(selected)) {
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error.error || "Upload failed");
      }

      const { data: result }: { data: ImportResult } = await res.json();
      onImportComplete(result);
      setFile(null);

      if (result.errors.length === 0) {
        toast.success(
          `Import complete: ${result.rowsCreated} created, ${result.rowsUpdated} updated`
        );
      } else {
        toast.warning(
          `Import complete with ${result.errors.length} errors. Check details below.`
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload file"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium">
            Drag and drop an Excel file here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports .xlsx files up to 10MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Selected file */}
      {file && (
        <div className="flex items-center gap-3 rounded-md border p-3">
          <FileSpreadsheet className="h-8 w-8 text-green-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setFile(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button onClick={handleUpload} disabled={uploading} className="gap-2">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
