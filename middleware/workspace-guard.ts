import { db } from "@/db";
import { workspaceMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ForbiddenError } from "@/lib/errors";

export async function requireWorkspaceMembership(
  userId: string,
  workspaceId: string
) {
  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.status, "active")
    ),
  });

  if (!member) {
    throw new ForbiddenError("You are not a member of this workspace");
  }

  return member;
}
