"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/shared/tag-input";
import { UploadDropzone } from "./upload-dropzone";
import { useUIStore } from "@/stores/ui-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useUpload, useUploadMultiple } from "@/hooks/use-upload";
import { toast } from "sonner";
import {
  File,
  Image as ImageIcon,
  FileText,
  Archive,
  Loader2,
  CheckCircle,
  XCircle,
  X,
  FolderOpen,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ALLOWED_FILE_TYPES, MAX_UPLOAD_SIZE_MB } from "@/lib/constants";
import { Switch } from "@/components/ui/switch";

export function UploadModal() {
  const isOpen = useUIStore((s) => s.isUploadModalOpen);
  const setOpen = useUIStore((s) => s.setUploadModalOpen);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const uploadSingle = useUpload();
  const uploadMultiple = useUploadMultiple();

  const [files, setFiles] = useState<File[]>([]);
  const [isFolderMode, setIsFolderMode] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [retention, setRetention] = useState<"temporary" | "permanent">(
    "temporary"
  );

  // Upload state untuk setiap file
  const [uploadStates, setUploadStates] = useState<
    Record<string, { status: "pending" | "uploading" | "success" | "error"; progress: number; error?: string }
  >>({});

  // Loading state saat proses file (setelah selesssi dipilih)
  const [isProcessing, setIsProcessing] = useState(false);

  function reset() {
    setFiles([]);
    setIsFolderMode(false);
    setTitle("");
    setNote("");
    setTags([]);
    setRetention("temporary");
    setUploadStates({});
    setIsProcessing(false);
  }

  function handleClose() {
    if (!uploadSingle.isUploading && !uploadMultiple.isUploading && !isProcessing) {
      setOpen(false);
      reset();
    }
  }

  async function handleFilesSelected(selectedFiles: File[]) {
    setIsProcessing(true);

    // Simulate processing time untuk preview generation
    await new Promise(resolve => setTimeout(resolve, 500));

    // Initialize upload states
    const newStates: typeof uploadStates = {};
    for (const file of selectedFiles) {
      const fileId = `${file.name}-${file.size}`;
      newStates[fileId] = { status: "pending" as const, progress: 0 };
    }

    setUploadStates(prev => ({ ...prev, ...newStates }));
    setFiles(selectedFiles);

    // Auto-detect folder mode
    if (selectedFiles.length > 1) {
      setIsFolderMode(true);
      // Auto-generate folder name dari nama file pertama
      const firstName = selectedFiles[0].name.replace(/\.[^.]+$/, "");
      setTitle(firstName);
    } else {
      setIsFolderMode(false);
      // Auto-fill title untuk single file
      if (!title) {
        const firstName = selectedFiles[0].name.replace(/\.[^.]+$/, "");
        setTitle(firstName);
      }
    }

    setIsProcessing(false);
  }

  function removeFile(index: number) {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);

    // Clean up upload state
    const file = files[index];
    if (file) {
      const fileId = `${file.name}-${file.size}`;
      setUploadStates(prev => {
        const updated = { ...prev };
        delete updated[fileId];
        return updated;
      });
    }

    // Switch back to single mode jika只剩 1 file
    if (newFiles.length === 0) {
      setIsFolderMode(false);
      setTitle("");
    } else if (newFiles.length === 1 && isFolderMode) {
      setIsFolderMode(false);
    } else if (isFolderMode && title.includes(" +")) {
      // Update folder name
      const firstName = newFiles[0].name.replace(/\.[^.]+$/, "");
      setTitle(`${firstName} (+${newFiles.length - 1} more)`);
    }
  }

  async function handleUpload() {
    if (files.length === 0 || !activeWorkspaceId) return;

    const folderName = title || undefined;

    // Mark all as uploading
    setUploadStates(prev => {
      const updated = { ...prev };
      files.forEach(file => {
        const fileId = `${file.name}-${file.size}`;
        if (updated[fileId]) {
          updated[fileId] = { status: "uploading" as const, progress: 0 };
        }
      });
      return updated;
    });

    let successCount = 0;
    let errorCount = 0;

    try {
      if (files.length === 1) {
        // Single upload
        const file = files[0];
        const fileId = `${file.name}-${file.size}`;

        setUploadStates(prev => ({
          ...prev,
          [fileId]: { status: "uploading" as const, progress: 30 },
        }));

        await new Promise(resolve => setTimeout(resolve, 200));

        setUploadStates(prev => ({
          ...prev,
          [fileId]: { status: "uploading" as const, progress: 70 },
        }));

        await uploadSingle.mutateAsync({
          file,
          workspaceId: activeWorkspaceId,
          title: isFolderMode ? undefined : (title || undefined),
          note: note || undefined,
          tags: tags.length > 0 ? tags : undefined,
          isPinned: retention === "permanent",
        });

        setUploadStates(prev => ({
          ...prev,
          [fileId]: { status: "success" as const, progress: 100 },
        }));
        successCount++;

      } else {
        // Multiple upload - gunakan batch folder name
        await uploadMultiple.mutateAsync({
          files,
          workspaceId: activeWorkspaceId,
          folderName: folderName,
          note: note || undefined,
          tags: tags.length > 0 ? tags : undefined,
          isPinned: retention === "permanent",
        });

        // Update semua ke success
        files.forEach(file => {
          const fileId = `${file.name}-${file.size}`;
          setUploadStates(prev => ({
            ...prev,
            [fileId]: { status: "success" as const, progress: 100 },
          }));
        });
        successCount = files.length;
      }
    } catch (err) {
      // Mark semua sebagai error
      files.forEach(file => {
        const fileId = `${file.name}-${file.size}`;
        setUploadStates(prev => ({
          ...prev,
          [fileId]: { status: "error" as const, progress: 0, error: "Upload failed" },
        }));
      });
      errorCount = files.length;
    }

    // Show summary toast
    if (successCount === files.length) {
      const message = isFolderMode
        ? `Folder "${folderName}" created with ${successCount} file${successCount > 1 ? "s" : ""}`
        : `${successCount} file${successCount > 1 ? "s" : ""} uploaded successfully`;
      toast.success(message);
    } else if (errorCount === files.length) {
      toast.error("All uploads failed");
    } else {
      toast.success(`${successCount} of ${files.length} files uploaded`);
      if (errorCount > 0) {
        toast.error(`${errorCount} file${errorCount > 1 ? "s" : ""} failed to upload`);
      }
    }

    // Close modal after delay
    setTimeout(() => {
      handleClose();
    }, 1500);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(mimeType: string): React.ElementType {
    if (mimeType.startsWith("image/")) return ImageIcon;
    if (mimeType === "application/pdf") return FileText;
    if (mimeType.includes("word") || mimeType.includes("document")) return FileText;
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return FileText;
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return FileText;
    if (mimeType.includes("zip") || mimeType.includes("archive")) return Archive;
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

  const isUploading = Object.values(uploadStates).some(s => s.status === "uploading");
  const allComplete = Object.values(uploadStates).every(s => s.status === "success" || s.status === "error");
  const canUpload = files.length > 0 && !isUploading && !isProcessing;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {files.length > 0 ? (
              <span className="flex items-center gap-2">
                {isFolderMode ? <FolderOpen className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                Upload {files.length} File{files.length > 1 ? "s" : ""}
              </span>
            ) : (
              "Upload File"
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Dropzone */}
          <UploadDropzone
            onFilesSelected={handleFilesSelected}
            maxFiles={5}
            disabled={isUploading || isProcessing}
          />

          {/* Loading/Processing State */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-muted/50 animate-in fade-in">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Processing files...</span>
            </div>
          )}

          {/* Folder Mode Toggle untuk Multiple Files */}
          {files.length > 1 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 animate-in fade-in">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium">Create as folder</p>
                  <p className="text-xs text-muted-foreground">Group files with a folder name</p>
                </div>
              </div>
              <Switch
                checked={isFolderMode}
                onCheckedChange={setIsFolderMode}
                disabled={isUploading}
              />
            </div>
          )}

          {/* File List with Upload Progress */}
          {files.length > 0 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {isFolderMode ? "Folder contents" : "Selected Files"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {files.length} / 5 max
                </span>
              </div>

              {/* Folder Name Input */}
              {isFolderMode && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="folder-name">Folder Name</Label>
                  <Input
                    id="folder-name"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Project Files"
                    disabled={isUploading}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Files will be grouped under this folder name
                  </p>
                </div>
              )}

              {/* Files List */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {files.map((file, index) => {
                  const fileId = `${file.name}-${file.size}`;
                  const state = uploadStates[fileId] || { status: "pending" as const, progress: 0 };
                  const Icon = getFileIcon(file.type);
                  const iconColor = getFileColor(file.type);

                  return (
                    <div
                      key={fileId}
                      className={cn(
                        "relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                        state.status === "uploading" && "bg-primary/5",
                        state.status === "success" && "bg-green-500/5",
                        state.status === "error" && "bg-destructive/5"
                      )}
                    >
                      {/* File Icon */}
                      <div className="shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                          <Icon className={cn("w-5 h-5", iconColor)} />
                        </div>
                      </div>

                      {/* File Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          {state.status === "success" && (
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          )}
                          {state.status === "error" && (
                            <XCircle className="w-4 h-4 text-destructive shrink-0" />
                          )}
                          {state.status === "uploading" && (
                            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatSize(file.size)}</span>

                          {/* Progress bar untuk uploading */}
                          {state.status === "uploading" && (
                            <span>{state.progress}%</span>
                          )}
                          {state.status === "success" && (
                            <span className="text-green-500">Complete</span>
                          )}
                          {state.status === "error" && (
                            <span className="text-destructive">Failed</span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {state.status === "uploading" && (
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary transition-all duration-300 ease-out animate-pulse"
                              style={{ width: `${state.progress}%` }}
                            />
                          </div>
                        )}
                        {state.status === "success" && (
                          <div className="mt-2 h-1.5 w-full rounded-full bg-green-500 animate-in fade-in" />
                        )}
                        {state.status === "error" && (
                          <div className="mt-2 h-1.5 w-full rounded-full bg-destructive animate-in fade-in" />
                        )}
                      </div>

                      {/* Remove Button */}
                      {!isUploading && !isProcessing && state.status === "pending" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title (only for single file or folder mode) */}
          {files.length === 1 && !isFolderMode && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
              <Label htmlFor="upload-title">Title</Label>
              <Input
                id="upload-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="File title"
                disabled={isUploading}
              />
            </div>
          )}

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="upload-note">Note (optional)</Label>
            <Textarea
              id="upload-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              disabled={isUploading}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags (optional)</Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          {/* Retention */}
          <div className="space-y-1.5">
            <Label>Retention</Label>
            <Select
              value={retention}
              onValueChange={(v) =>
                setRetention(v as "temporary" | "permanent")
              }
              disabled={isUploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temporary">
                  Temporary (7 days)
                </SelectItem>
                <SelectItem value="permanent">
                  Permanent (pinned)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading || isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!canUpload || allComplete}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : allComplete ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Done
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {files.length > 1 ? `(${files.length})` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
