import { db } from "@/db";
import { items, fileAssets } from "@/db/schema";
import { eq, and, desc, sql, ilike, or, isNull, type SQL } from "drizzle-orm";
import { buildSignedUrl } from "@/lib/file-storage";
import type { ItemType } from "@/types";

type SearchParams = {
  workspaceId: string;
  q: string;
  type?: ItemType;
  tags?: string; // comma-separated
  page: number;
  limit: number;
};

export async function searchItems(params: SearchParams) {
  const { workspaceId, q, type, tags, page, limit } = params;
  const offset = (page - 1) * limit;
  const pattern = `%${q}%`;

  const conditions: SQL[] = [
    eq(items.workspaceId, workspaceId),
    // Exclude soft-deleted items
    isNull(items.deletedAt),
    // Exclude expired items
    sql`(${items.expiresAt} IS NULL OR ${items.expiresAt} > NOW())`,
    // Search in title, content, note, AND OCR text
    or(
      ilike(items.title, pattern),
      ilike(items.content, pattern),
      ilike(items.note, pattern),
      ilike(items.ocrText, pattern), // Include OCR text in search
    )!,
  ];

  if (type) {
    conditions.push(eq(items.type, type));
  }

  // Filter by tags (array overlap)
  if (tags) {
    const tagArray = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (tagArray.length > 0) {
      conditions.push(
        sql`${items.tags} && ARRAY[${sql.join(
          tagArray.map((t) => sql`${t}`),
          sql`, `,
        )}]::text[]`,
      );
    }
  }

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select({
        item: items,
        fileAsset: fileAssets,
      })
      .from(items)
      .leftJoin(fileAssets, eq(items.fileAssetId, fileAssets.id))
      .where(where)
      .orderBy(desc(items.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(where),
  ]);

  const total = countResult[0]?.count ?? 0;

  const results = data.map((row) => ({
    ...row.item,
    fileAsset: row.fileAsset
      ? {
          ...row.fileAsset,
          downloadUrl: buildSignedUrl(row.fileAsset.id),
        }
      : null,
    // Include flag if match was from OCR
    matchedViaOcr: row.item.ocrText?.toLowerCase().includes(q.toLowerCase()) || false,
  }));

  return {
    data: results,
    meta: {
      page,
      limit,
      total,
    },
  };
}
