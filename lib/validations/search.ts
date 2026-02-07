import { z } from "zod/v4";

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  workspaceId: z.string().min(1),
  type: z.enum(["drop", "link", "note"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
