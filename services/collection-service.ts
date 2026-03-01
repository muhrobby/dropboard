import { randomBytes } from "crypto";
import { db } from "@/db";
import { collections, items } from "@/db/schema";
import { eq, and, asc, isNotNull } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { PublicBoardResponse } from "@/types/api";

export type CollectionRow = typeof collections.$inferSelect;

/**
 * Format a collection row into the API response shape, injecting boardUrl.
 */
export function formatCollection(col: CollectionRow, appUrl?: string): CollectionRow & { boardUrl: string | null } {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? appUrl ?? "";
  return {
    ...col,
    boardUrl: col.isPublic && col.shareToken ? `${base}/board/${col.shareToken}` : null,
  };
}

export async function listCollections(workspaceId: string): Promise<ReturnType<typeof formatCollection>[]> {
  const rows = await db.query.collections.findMany({
    where: eq(collections.workspaceId, workspaceId),
    orderBy: [asc(collections.name)],
  });
  return rows.map((r) => formatCollection(r));
}

export async function getCollection(id: string, workspaceId: string): Promise<CollectionRow> {
  const col = await db.query.collections.findFirst({
    where: and(eq(collections.id, id), eq(collections.workspaceId, workspaceId)),
  });
  if (!col) throw new NotFoundError("Collection not found");
  return col;
}

export async function createCollection(data: {
  workspaceId: string;
  createdBy: string;
  name: string;
  parentId?: string | null;
}): Promise<ReturnType<typeof formatCollection>> {
  // Validate parentId belongs to same workspace
  if (data.parentId) {
    const parent = await db.query.collections.findFirst({
      where: and(
        eq(collections.id, data.parentId),
        eq(collections.workspaceId, data.workspaceId),
      ),
    });
    if (!parent) throw new NotFoundError("Parent collection not found");
  }

  const now = new Date();
  const [col] = await db
    .insert(collections)
    .values({
      workspaceId: data.workspaceId,
      createdBy: data.createdBy,
      name: data.name.trim(),
      parentId: data.parentId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return formatCollection(col);
}

export async function updateCollection(
  id: string,
  workspaceId: string,
  userId: string,
  data: { name?: string; parentId?: string | null }
): Promise<ReturnType<typeof formatCollection>> {
  const col = await getCollection(id, workspaceId);
  if (col.createdBy !== userId) throw new ForbiddenError("Not the collection owner");

  // Prevent circular nesting
  if (data.parentId === id) throw new ForbiddenError("A collection cannot be its own parent");

  const [updated] = await db
    .update(collections)
    .set({
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(collections.id, id))
    .returning();
  return formatCollection(updated);
}

export async function deleteCollection(id: string, workspaceId: string, userId: string): Promise<void> {
  const col = await getCollection(id, workspaceId);
  if (col.createdBy !== userId) throw new ForbiddenError("Not the collection owner");

  // Unassign items in this collection (set collectionId to null)
  await db
    .update(items)
    .set({ collectionId: null })
    .where(and(eq(items.collectionId, id), eq(items.workspaceId, workspaceId)));

  // Re-parent children to parent of deleted collection
  await db
    .update(collections)
    .set({ parentId: col.parentId })
    .where(eq(collections.parentId, id));

  await db.delete(collections).where(eq(collections.id, id));
}

// ── Phase 4: Public Board Sharing ─────────────────────────────────────────────

/**
 * Publish a collection as a public board.
 * Generates a unique share token if one doesn't already exist.
 * Only the collection owner can publish it.
 */
export async function publishCollection(
  id: string,
  workspaceId: string,
  userId: string
): Promise<ReturnType<typeof formatCollection>> {
  const col = await getCollection(id, workspaceId);
  if (col.createdBy !== userId) throw new ForbiddenError("Not the collection owner");

  const token = col.shareToken ?? randomBytes(16).toString("hex");

  const [updated] = await db
    .update(collections)
    .set({ isPublic: true, shareToken: token, updatedAt: new Date() })
    .where(eq(collections.id, id))
    .returning();

  return formatCollection(updated);
}

/**
 * Unpublish a collection — sets isPublic = false (keeps token for re-publish).
 * Only the collection owner can unpublish.
 */
export async function unpublishCollection(
  id: string,
  workspaceId: string,
  userId: string
): Promise<ReturnType<typeof formatCollection>> {
  const col = await getCollection(id, workspaceId);
  if (col.createdBy !== userId) throw new ForbiddenError("Not the collection owner");

  const [updated] = await db
    .update(collections)
    .set({ isPublic: false, updatedAt: new Date() })
    .where(eq(collections.id, id))
    .returning();

  return formatCollection(updated);
}

/**
 * Fetch a public board by share token — no auth required.
 * Returns the collection metadata and its non-deleted link/note items.
 */
export async function getPublicBoard(token: string): Promise<PublicBoardResponse> {
  const col = await db.query.collections.findFirst({
    where: and(
      eq(collections.shareToken, token),
      eq(collections.isPublic, true),
    ),
  });

  if (!col) throw new NotFoundError("Board not found or is no longer public");

  // Fetch non-deleted link/note items in this collection
  const boardItems = await db.query.items.findMany({
    where: and(
      eq(items.collectionId, col.id),
      eq(items.workspaceId, col.workspaceId),
      // Only link and note types; no drops (files)
      isNotNull(items.id),
    ),
    orderBy: [asc(items.createdAt)],
  });

  // Filter out deleted items and drops in application code (simpler than adding pgEnum filter)
  const publicItems = boardItems
    .filter((item) => !item.deletedAt && (item.type === "link" || item.type === "note"))
    .map((item) => ({
      id: item.id,
      type: item.type as "link" | "note",
      title: item.title,
      content: item.passwordHash !== null ? null : (item.content ?? null),
      note: item.passwordHash !== null ? null : (item.note ?? null),
      tags: item.tags,
      createdAt: item.createdAt.toISOString(),
      linkMetadata: item.linkMetadata as PublicBoardResponse["items"][number]["linkMetadata"] ?? null,
    }));

  return {
    collection: {
      id: col.id,
      name: col.name,
      shareToken: col.shareToken!,
    },
    items: publicItems,
  };
}
