"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, User, AlignLeft, Layout, Tag, X, CheckSquare, Paperclip, Plus, Trash, Eye, Pencil, MessageSquare, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTodoStore, TodoTask } from "@/stores/todo-store";
import { updateTask, getTaskComments, createComment, deleteComment, CommentWithAuthor } from "@/app/actions/todo-actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { AttachmentBrowser } from "./attachment-browser";

interface TaskDetailSheetProps {
  task: TodoTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

interface WorkspaceMember {
  userId: string;
  user: {
    name: string | null;
    image: string | null;
  };
}

export function TaskDetailSheet({ task, open, onOpenChange, workspaceId }: TaskDetailSheetProps) {
  const { updateTask: updateTaskState, columns } = useTodoStore();
  
  // Local state for debounced saves
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPreviewingDescription, setIsPreviewingDescription] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [isAttachmentBrowserOpen, setIsAttachmentBrowserOpen] = useState(false);

  // Comments state
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Reset local state and reload comments only when the *task ID* changes (not on every
  // reference update from the store, which would cause an infinite loop).
  const taskId = task?.id;
  useEffect(() => {
    if (!taskId) return;
    setTitle(task!.title || "");
    setDescription(task!.description || "");
    setComments([]);
    setCommentBody("");
    getTaskComments(taskId, workspaceId).then((res) => {
      if (res.success && res.comments) {
        setComments(res.comments);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, workspaceId]); // intentionally exclude `task` object — only re-run on id change

  // Fetch workspace members for assignee dropdown
  const { data: membersResponse } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/members`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!workspaceId && open,
  });

  const members = membersResponse?.data || [];

  // Stabilize AttachmentBrowser props to avoid new references every render.
  const existingAttachmentIds = useMemo(
    () => task?.attachments?.map((a) => a.id) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task?.attachments]
  );
  const handleAttach = useCallback(
    (newItems: Parameters<React.ComponentProps<typeof AttachmentBrowser>["onAttach"]>[0]) => {
      if (!task) return;
      const newAttachments = newItems.map((item) => ({
        id: item.id,
        name: item.title,
        url: item.fileAsset?.downloadUrl || "",
        size: item.fileAsset?.sizeBytes || 0,
        mimeType: item.fileAsset?.mimeType || "application/octet-stream",
      }));
      const merged = [...(task.attachments || []), ...newAttachments];
      // Inline save to avoid referencing handleSave before it is defined
      updateTaskState(task.id, { attachments: merged });
      updateTask({ id: task.id, workspaceId, attachments: merged } as Parameters<typeof updateTask>[0]).then((res) => {
        if (!res.success) toast.error("Failed to add attachments");
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task?.attachments, task?.id, workspaceId]
  );

  if (!task) return null;

  const column = columns.find(c => c.id === task.columnId);

  // Handlers for instant state update + backend save
  const handleSave = async (updates: Partial<TodoTask>) => {
    updateTaskState(task.id, updates); // Optimistic UI
    
    try {
      const payload = {
        id: task.id,
        workspaceId,
        ...updates,
      } as Parameters<typeof updateTask>[0];

      const res = await updateTask(payload);
      if (!res.success) throw new Error(res.error);
    } catch {
      toast.error("Failed to update task");
      // Ideally revert state here, but simple error toast for now
    }
  };

  const handleTitleBlur = () => {
    if (title !== task.title && title.trim()) {
      handleSave({ title });
    } else if (!title.trim()) {
      setTitle(task.title); // Reset if empty
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== (task.description || "")) {
      handleSave({ description });
    }
  };

  const handleSendComment = async () => {
    if (!commentBody.trim() || !task) return;
    setIsSendingComment(true);
    const res = await createComment({ taskId: task.id, workspaceId, body: commentBody.trim() });
    setIsSendingComment(false);
    if (res.success && res.comment) {
      setComments((prev) => [res.comment!, ...prev]);
      setCommentBody("");
    } else {
      toast.error("Failed to post comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task) return;
    const res = await deleteComment({ commentId, workspaceId });
    if (res.success) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } else {
      toast.error("Failed to delete comment");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto p-0 flex flex-col gap-0 border-l-0 sm:border-l border-zinc-200 dark:border-zinc-800">
        <SheetHeader className="p-6 pb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Layout className="w-4 h-4" />
            <span>In list <span className="font-medium text-foreground">{column?.title || "Unknown"}</span></span>
          </div>
          <SheetTitle className="sr-only">Task Details</SheetTitle>
          <Input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="text-xl font-bold border-transparent focus-visible:ring-transparent focus-visible:border-border hover:border-border/50 px-2 -ml-2 shadow-none transition-colors"
          />
        </SheetHeader>

        <div className="flex-1 p-6 space-y-8">
          
          {/* Properties Grid */}
          <div className="grid grid-cols-[120px_1fr] gap-y-4 gap-x-2 items-center text-sm">
            
            {/* Assignee */}
            <div className="text-muted-foreground font-medium">Assignee</div>
            <div>
              <Select 
                value={task.assignedTo || "unassigned"} 
                onValueChange={(val) => handleSave({ assignedTo: val === "unassigned" ? null : val })}
              >
                <SelectTrigger className="w-fit border-transparent hover:border-border/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 shadow-none px-2 -ml-2 h-8">
                  <SelectValue placeholder="Unassigned">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={members.find((m: WorkspaceMember) => m.userId === task.assignedTo)?.user?.image || ""} />
                        <AvatarFallback className="text-[10px]"><User className="h-3 w-3"/></AvatarFallback>
                      </Avatar>
                      <span>
                        {task.assignedTo 
                          ? members.find((m: WorkspaceMember) => m.userId === task.assignedTo)?.user?.name || "Unknown User"
                          : "Unassigned"}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5"><AvatarFallback><User className="h-3 w-3"/></AvatarFallback></Avatar>
                      <span>Unassigned</span>
                    </div>
                  </SelectItem>
                  {members.map((member: WorkspaceMember) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.user.image || ""} />
                          <AvatarFallback className="text-[10px]">{member.user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                        <span>{member.user.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="text-muted-foreground font-medium">Due date</div>
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-fit justify-start text-left font-normal border border-transparent hover:border-border/50 px-2 -ml-2 h-8",
                      !task.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {task.dueDate ? format(new Date(task.dueDate), "PPP") : <span>No date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={task.dueDate ? new Date(task.dueDate) : undefined}
                    onSelect={(date) => handleSave({ dueDate: date || null })}
                    initialFocus
                  />
                  {task.dueDate && (
                    <div className="p-2 border-t border-border">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        onClick={() => handleSave({ dueDate: null })}
                      >
                        Remove date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Priority */}
            <div className="text-muted-foreground font-medium">Priority</div>
            <div>
              <Select 
                value={task.priority} 
                onValueChange={(val: "low" | "medium" | "high" | "urgent") => handleSave({ priority: val })}
              >
                <SelectTrigger className="w-fit border-transparent hover:border-border/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 shadow-none px-2 -ml-2 h-8 capitalize">
                  <SelectValue placeholder="Priority">
                    {task.priority || "Medium"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Labels */}
            <div className="text-muted-foreground font-medium self-start mt-2">Labels</div>
            <div className="flex flex-wrap items-center gap-1.5 min-h-8">
              {task.labels && task.labels.map((label) => (
                <Badge key={label} variant="secondary" className="px-1.5 py-0.5 text-xs font-normal bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
                  {label}
                  <button
                    onClick={() => handleSave({ labels: task.labels.filter(l => l !== label) })}
                    className="ml-1 text-muted-foreground hover:text-foreground outline-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground">
                    <Tag className="w-3 h-3 mr-1" /> Add
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="space-y-2">
                    <h4 className="font-medium text-xs text-muted-foreground px-1">Add Label</h4>
                    <Input 
                      placeholder="Type and press Enter" 
                      className="h-8 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = e.currentTarget.value.trim();
                          if (val && !task.labels?.includes(val)) {
                            handleSave({ labels: [...(task.labels || []), val] });
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

          </div>

          {/* Description */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-muted-foreground" />
                <h3>Description</h3>
              </div>
              <button
                onClick={() => setIsPreviewingDescription(p => !p)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isPreviewingDescription ? (
                  <><Pencil className="w-3 h-3" /> Edit</>
                ) : (
                  <><Eye className="w-3 h-3" /> Preview</>
                )}
              </button>
            </div>
            <div className="pl-6">
              {isPreviewingDescription ? (
                <div
                  className={cn(
                    "min-h-[150px] rounded-md border border-border px-3 py-2 text-sm prose prose-sm dark:prose-invert max-w-none",
                    "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded prose-code:text-xs"
                  )}
                >
                  {description.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground italic">No description yet. Switch to Edit to write one.</p>
                  )}
                </div>
              ) : (
                <>
                  <Textarea
                    placeholder="Add a description... Markdown is supported."
                    className="min-h-[150px] resize-y bg-zinc-50 dark:bg-zinc-900/50 border-transparent focus-visible:border-border focus-visible:bg-transparent transition-colors font-mono text-sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescriptionBlur}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Supports **bold**, *italic*, `code`, lists, and [links](url).
                  </p>
                  {description !== (task.description || "") && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" onClick={() => handleSave({ description })}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDescription(task.description || "")}>Cancel</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-muted-foreground" />
                <h3>Checklist</h3>
              </div>
            </div>
            
            <div className="pl-6 space-y-2">
              {task.subtasks && task.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-start gap-2 group">
                  <Checkbox 
                    checked={subtask.completed} 
                    onCheckedChange={(checked) => {
                      const updated = task.subtasks.map(st => 
                        st.id === subtask.id ? { ...st, completed: checked as boolean } : st
                      );
                      handleSave({ subtasks: updated });
                    }}
                    className="mt-1"
                  />
                  <div className={cn(
                    "flex-1 text-sm pt-0.5", 
                    subtask.completed && "line-through text-muted-foreground"
                  )}>
                    {subtask.title}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500"
                    onClick={() => {
                      handleSave({ subtasks: task.subtasks.filter(st => st.id !== subtask.id) });
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-2 mt-2">
                <Input 
                  placeholder="Add an item..." 
                  className="h-8 text-sm"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSubtask.trim()) {
                      const newId = crypto.randomUUID();
                      handleSave({ 
                        subtasks: [...(task.subtasks || []), { id: newId, title: newSubtask.trim(), completed: false }] 
                      });
                      setNewSubtask("");
                    }
                  }}
                />
                <Button 
                  size="sm" 
                  className="h-8 shrink-0" 
                  disabled={!newSubtask.trim()}
                  onClick={() => {
                    if (newSubtask.trim()) {
                      const newId = crypto.randomUUID();
                      handleSave({ 
                        subtasks: [...(task.subtasks || []), { id: newId, title: newSubtask.trim(), completed: false }] 
                      });
                      setNewSubtask("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <h3>Attachments</h3>
              </div>
            </div>
            
            <div className="pl-6 space-y-2">
              {task.attachments && task.attachments.length > 0 ? (
                <div className="grid gap-2">
                  {task.attachments.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 group">
                      <div className="h-10 w-10 shrink-0 bg-zinc-200 dark:bg-zinc-800 rounded flex items-center justify-center">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          {file.mimeType?.startsWith("image/") && (
                            <button
                              onClick={() => {
                                const newAttachments = task.attachments.map(a => ({
                                  ...a,
                                  isCover: a.id === file.id ? !a.isCover : false // only one cover allowed
                                }));
                                handleSave({ attachments: newAttachments });
                              }}
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-sm transition-colors",
                                file.isCover 
                                  ? "bg-primary/10 text-primary font-medium" 
                                  : "bg-zinc-200/50 dark:bg-zinc-800 text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {file.isCover ? "Cover" : "Set Cover"}
                            </button>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                        onClick={() => {
                          handleSave({ attachments: task.attachments.filter(a => a.id !== file.id) });
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pb-2">No attachments yet.</p>
              )}
              
              <Button variant="outline" size="sm" className="w-full h-8 border-dashed" onClick={() => setIsAttachmentBrowserOpen(true)}>
                <Plus className="h-3 w-3 mr-2" /> Add Attachment
              </Button>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 font-medium">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <h3>Comments</h3>
              {comments.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">({comments.length})</span>
              )}
            </div>

            {/* Compose */}
            <div className="pl-6 space-y-2">
              <Textarea
                placeholder="Write a comment..."
                className="min-h-[80px] resize-none bg-zinc-50 dark:bg-zinc-900/50 border-transparent focus-visible:border-border focus-visible:bg-transparent transition-colors text-sm"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleSendComment();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">⌘↵ to send</p>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!commentBody.trim() || isSendingComment}
                  onClick={handleSendComment}
                >
                  {isSendingComment ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Send className="h-3 w-3 mr-1" />
                  )}
                  Send
                </Button>
              </div>
            </div>

            {/* Comment list */}
            <div className="pl-6 space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground pb-2">No comments yet. Be the first to comment.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="group flex gap-2.5">
                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                      <AvatarImage src={comment.author?.image || ""} />
                      <AvatarFallback className="text-[10px]">
                        {comment.author?.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-semibold">{comment.author?.name || "Unknown"}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">{comment.body}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500 shrink-0"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>

      <AttachmentBrowser 
        open={isAttachmentBrowserOpen}
        onOpenChange={setIsAttachmentBrowserOpen}
        existingAttachmentIds={existingAttachmentIds}
        onAttach={handleAttach}
      />
    </Sheet>
  );
}