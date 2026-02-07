import { z } from "zod/v4";
import { ALLOWED_FILE_TYPES, MAX_UPLOAD_SIZE_MB } from "@/lib/constants";

export const createDropSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or less"),
  note: z.string().max(5000, "Note must be 5000 characters or less").optional(),
  tags: z.array(z.string().max(50)).max(10, "Maximum 10 tags").default([]),
  isPinned: z.boolean().default(false),
});

export const createLinkSchema = z.object({
  content: z.string().url("Must be a valid URL"),
  title: z
    .string()
    .max(255, "Title must be 255 characters or less")
    .optional(),
  note: z.string().max(5000, "Note must be 5000 characters or less").optional(),
  tags: z.array(z.string().max(50)).max(10, "Maximum 10 tags").default([]),
});

export const createNoteSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or less"),
  content: z
    .string()
    .min(1, "Note content is required")
    .max(50000, "Note must be 50000 characters or less"),
  tags: z.array(z.string().max(50)).max(10, "Maximum 10 tags").default([]),
});

export const updateItemSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or less")
    .optional(),
  note: z
    .string()
    .max(5000, "Note must be 5000 characters or less")
    .nullish(),
  content: z
    .string()
    .max(50000, "Content must be 50000 characters or less")
    .optional(),
  tags: z
    .array(z.string().max(50))
    .max(10, "Maximum 10 tags")
    .optional(),
});

export const listItemsQuerySchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  type: z.enum(["drop", "link", "note"]).optional(),
  pinned: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  page: z
    .string()
    .default("1")
    .transform((v) => parseInt(v, 10)),
  limit: z
    .string()
    .default("20")
    .transform((v) => parseInt(v, 10)),
});

export const allowedMimeTypes = ALLOWED_FILE_TYPES;
export const maxFileSizeMB = MAX_UPLOAD_SIZE_MB;

export type CreateDropInput = z.infer<typeof createDropSchema>;
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
