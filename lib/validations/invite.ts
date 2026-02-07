import { z } from "zod/v4";
import type { InviteRole } from "@/types";

export const createInviteSchema = z.object({
  targetIdentifier: z.string().min(1).max(255),
  role: z.enum(["admin", "member"]) as z.ZodType<InviteRole>,
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});
