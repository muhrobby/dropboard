"use client";

import { useCallback, useState, useRef, type DragEvent } from "react";
import {
  Upload,
  CloudUpload,
  File,
  Image as ImageIcon,
  FileText,
  Archive,
  X,
  Check,
  AlertCircle
} from "lucide-react";
import { ALLOWED_FILE_TYPES, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

type UploadDropzoneProps = {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
};

type FileWithPreview = {
  file: File;
  preview: string | null;
  id: string;
};

function validateFile(file: File): string | null {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported file type.`;
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return `"${file.name}" exceeds the ${MAX_UPLOAD_SIZE_MB}MB size limit.`;
  }
  return null;
}

function getFileIcon(mimeType: string): React.ElementType {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("word") || mimeType.includes("document")) return FileText;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return FileText;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return FileText;
  if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("compressed")) return Archive;
  if (mimeType.startsWith("text/")) return FileText;
  return File;
}

function getFileColor(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "text-purple-500";
  if (mimeType === "application/pdf") return "text-red-500";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "text-green-500";
  if (mimeType.includes("word") || mimeType.includes("document")) return "text-blue-500";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "text-orange-500";
  if (mimeType.includes("zip") || mimeType.includes("archive")) return "text-yellow-600";
  return "text-gray-500";
}

export function UploadDropzone({
  onFilesSelected,
  maxFiles = 5,
  disabled = false,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate preview for images
  const generatePreview = useCallback((file: File): string | null => {
    if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    return null;
  }, []);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      // Check max files limit
      const totalFiles = files.length + newFiles.length;
      if (totalFiles > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed. You have ${files.length}, trying to add ${newFiles.length}.`);
        return;
      }

      // Validate all files
      const fileWithPreview: FileWithPreview[] = [];
      for (const file of newFiles) {
        const err = validateFile(file);
        if (err) {
          setError(err);
          return;
        }
        fileWithPreview.push({
          file,
          preview: generatePreview(file),
          id: `${file.name}-${file.size}-${Date.now()}`,
        });
      }

      setError(null);
      setFiles((prev) => [...prev, ...fileWithPreview]);

      // Notify parent
      onFilesSelected([...files, ...fileWithPreview].map(f => f.file));
    },
    [files, maxFiles, generatePreview, onFilesSelected]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const updated = prev.filter(f => f.id !== id);
      // Clean up preview URLs
      const removed = prev.find(f => f.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      // Notify parent with remaining files
      onFilesSelected(updated.map(f => f.file));
      return updated;
    });
  }, [onFilesSelected]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    },
    [disabled, addFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (selected) {
        addFiles(Array.from(selected));
      }
      // Reset input
      e.target.value = "";
    },
    [addFiles]
  );

  // Clean up previews on unmount
  useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview);
        }
      });
    };
  }, [files]);

  return (
    <div className="space-y-4">
      {/* Dropzone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative group cursor-pointer transition-all duration-300",
          "rounded-2xl border-2 border-dashed",
          "min-h-[200px] flex flex-col items-center justify-center p-8",
          isDragging && !disabled
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* Animated Background Pattern */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500",
            "bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent",
            isDragging && !disabled && "opacity-100"
          )}
        />

        {/* Upload Icon with Animation */}
        <div className={cn(
          "relative z-10 transition-transform duration-300",
          isDragging && !disabled ? "scale-110" : "group-hover:scale-105"
        )}>
          <div className="relative">
            {/* Rotating dashed circle when dragging */}
            {isDragging && !disabled && (
              <div className="absolute inset-0 -m-4">
                <div className="w-full h-full rounded-full border-2 border-dashed border-primary/30 animate-spin" />
              </div>
            )}

            <div className={cn(
              "relative flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300",
              isDragging && !disabled
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground group-hover:bg-primary/20"
            )}>
              {isDragging ? (
                <CloudUpload className="w-8 h-8 animate-bounce" />
              ) : (
                <Upload className="w-8 h-8" />
              )}
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="relative z-10 text-center mt-4 space-y-1">
          <p className="text-base font-semibold transition-colors">
            {isDragging ? (
              <span className="text-primary">Drop your files here</span>
            ) : (
              <>
                Drag & drop files or <span className="text-primary">browse</span>
              </>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            Up to {maxFiles} files • Max {MAX_UPLOAD_SIZE_MB}MB each
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            Images, PDF, Documents, Archives
          </p>
        </div>

        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          max={maxFiles}
          accept={ALLOWED_FILE_TYPES.join(",")}
          onChange={handleFileInput}
          disabled={disabled}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm animate-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {files.length} {files.length === 1 ? "file" : "files"} selected
            </span>
            <button
              onClick={() => {
                files.forEach(f => {
                  if (f.preview) URL.revokeObjectURL(f.preview);
                });
                setFiles([]);
                onFilesSelected([]);
              }}
              className="text-muted-foreground hover:text-destructive transition-colors text-xs"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {files.map((fileWithPreview, index) => {
              const IconComponent = getFileIcon(fileWithPreview.file.type);
              const iconColor = getFileColor(fileWithPreview.file.type);

              return (
                <div
                  key={fileWithPreview.id}
                  className="group relative flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-200 animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* File Icon or Preview */}
                  <div className="relative shrink-0">
                    {fileWithPreview.preview ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-background">
                        <img
                          src={fileWithPreview.preview}
                          alt={fileWithPreview.file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center">
                        <IconComponent className={cn("w-6 h-6", iconColor)} />
                      </div>
                    )}

                    {/* Success indicator */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-background">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{fileWithPreview.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(fileWithPreview.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(fileWithPreview.id);
                    }}
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress indicator for max files */}
      {files.length >= maxFiles && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Maximum {maxFiles} files reached</span>
        </div>
      )}
    </div>
  );
}
