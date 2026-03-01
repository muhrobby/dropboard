"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Quote,
  Minus,
  Strikethrough,
  SquareCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect } from "react";

const lowlight = createLowlight(common);

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
};

type ToolbarButtonProps = {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 rounded",
              isActive && "bg-muted text-foreground",
            )}
            onClick={onClick}
            disabled={disabled}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something…",
  className,
  minHeight = "180px",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Replaced by CodeBlockLowlight
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g., form reset)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-input">
        <ToolbarButton
          title="Bold (Ctrl+B)"
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic (Ctrl+I)"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Inline Code (Ctrl+E)"
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
        >
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="h-4 w-px bg-border mx-1" />

        <ToolbarButton
          title="Bullet List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Code Block"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
        >
          <SquareCode className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="h-4 w-px bg-border mx-1" />

        <ToolbarButton
          title="Horizontal Rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className={cn(
          "px-3 py-2 text-sm [&_.ProseMirror]:outline-none",
          "[&_.ProseMirror]:min-h-[var(--editor-min-h)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
          // Typography
          "[&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-2",
          "[&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mb-1.5",
          "[&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mb-1",
          "[&_.ProseMirror_p]:mb-2 [&_.ProseMirror_p:last-child]:mb-0",
          "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:mb-2",
          "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:mb-2",
          "[&_.ProseMirror_li]:mb-0.5",
          "[&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-muted-foreground/30",
          "[&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:mb-2",
          "[&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:text-[0.85em] [&_.ProseMirror_code]:font-mono",
          "[&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:rounded-md [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:mb-2 [&_.ProseMirror_pre]:overflow-x-auto",
          "[&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0 [&_.ProseMirror_pre_code]:text-sm",
          "[&_.ProseMirror_hr]:border-t [&_.ProseMirror_hr]:border-border [&_.ProseMirror_hr]:my-3",
          "[&_.ProseMirror_strong]:font-semibold",
          "[&_.ProseMirror_em]:italic",
          "[&_.ProseMirror_s]:line-through",
        )}
        style={{ "--editor-min-h": minHeight } as React.CSSProperties}
      />
    </div>
  );
}
