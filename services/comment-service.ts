import { db } from "@/db";
import { itemComments, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { logActivity } from "@/services/activity-service";

/**
 * Format a comment row with author info.
 */
function formatComment(row: {
  comment: typeof itemComments.$inferSelect;
  author: { name: string | null; email: string; image: string | null } | null;
}) {
  return {
    ...row.comment,
    createdAt: row.comment.createdAt.toISOString(),
    updatedAt: row.comment.updatedAt.toISOString(),
    author: row.author
      ? {
          name: row.author.name ?? "",
          email: row.author.email,
          image: row.author.image,
        }
      : undefined,
  };
}

/**
 * List comments for an item, newest first.
 */
export async function listComments(itemId: string, workspaceId: string) {
  const rows = await db
    .select({
      comment: itemComments,
      author: {
        name: users.name,
        email: users.email,
        image: users.image,
      },
    })
    .from(itemComments)
    .leftJoin(users, eq(itemComments.authorId, users.id))
    .where(
      and(
        eq(itemComments.itemId, itemId),
        eq(itemComments.workspaceId, workspaceId),
      ),
    )
    .orderBy(desc(itemComments.createdAt));

  return rows.map(formatComment);
}

/**
 * Create a new comment on an item.
 */
export async function createComment(data: {
  itemId: string;
  workspaceId: string;
  authorId: string;
  body: string;
}) {
  const now = new Date();

  const [inserted] = await db
    .insert(itemComments)
    .values({
      itemId: data.itemId,
      workspaceId: data.workspaceId,
      authorId: data.authorId,
      body: data.body,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logActivity({
    workspaceId: data.workspaceId,
    actorId: data.authorId,
    action: "ITEM_COMMENT_ADDED",
    targetType: "drop",
    targetId: data.itemId,
    metadata: { commentId: inserted.id },
  });

  // Re-fetch with author info
  const rows = await db
    .select({
      comment: itemComments,
      author: {
        name: users.name,
        email: users.email,
        image: users.image,
      },
    })
    .from(itemComments)
    .leftJoin(users, eq(itemComments.authorId, users.id))
    .where(eq(itemComments.id, inserted.id))
    .limit(1);

  if (rows.length === 0) throw new NotFoundError("Comment not found after insert");

  return formatComment(rows[0]);
}

/**
 * Delete a comment. Only the author or workspace ops can delete.
 */
export async function deleteComment(
  commentId: string,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const rows = await db
    .select({ comment: itemComments })
    .from(itemComments)
    .where(
      and(
        eq(itemComments.id, commentId),
        eq(itemComments.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    throw new NotFoundError("Comment not found");
  }

  const comment = rows[0].comment;

  // Only the author can delete their own comment
  if (comment.authorId !== userId) {
    throw new ForbiddenError("You can only delete your own comments");
  }

  await db.delete(itemComments).where(eq(itemComments.id, commentId));

  logActivity({
    workspaceId,
    actorId: userId,
    action: "ITEM_COMMENT_DELETED",
    targetType: "drop",
    targetId: comment.itemId,
    metadata: { commentId },
  });
}
