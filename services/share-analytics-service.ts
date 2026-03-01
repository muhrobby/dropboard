import { db } from "@/db";
import { shareAnalytics, shares } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import type { ShareAnalyticsResponse } from "@/types/api";

export async function getShareAnalytics(
  shareId: string,
  workspaceId: string,
): Promise<ShareAnalyticsResponse> {
  // Verify the share exists and belongs to the workspace
  const share = await db.query.shares.findFirst({
    where: eq(shares.id, shareId),
    with: { item: true },
  });

  if (!share) throw new NotFoundError("Share not found");
  if (share.item.workspaceId !== workspaceId) {
    throw new NotFoundError("Share not found");
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // All entries (most recent 50 for display)
  const entries = await db.query.shareAnalytics.findMany({
    where: eq(shareAnalytics.shareId, shareId),
    orderBy: (t, { desc }) => [desc(t.accessedAt)],
    limit: 50,
  });

  // Count in last 30 days
  const [last30Result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(shareAnalytics)
    .where(
      and(
        eq(shareAnalytics.shareId, shareId),
        gte(shareAnalytics.accessedAt, thirtyDaysAgo),
      ),
    );

  // Daily counts for the last 30 days
  const dailyRows = await db
    .select({
      date: sql<string>`date_trunc('day', ${shareAnalytics.accessedAt})::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(shareAnalytics)
    .where(
      and(
        eq(shareAnalytics.shareId, shareId),
        gte(shareAnalytics.accessedAt, thirtyDaysAgo),
      ),
    )
    .groupBy(sql`date_trunc('day', ${shareAnalytics.accessedAt})`)
    .orderBy(sql`date_trunc('day', ${shareAnalytics.accessedAt})`);

  return {
    totalViews: share.accessCount,
    last30Days: last30Result?.count ?? 0,
    recentEntries: entries.map((e) => ({
      id: e.id,
      shareId: e.shareId,
      ipHash: e.ipHash,
      userAgent: e.userAgent,
      referer: e.referer,
      accessedAt: e.accessedAt.toISOString(),
    })),
    dailyCounts: dailyRows.map((r) => ({ date: r.date, count: r.count })),
  };
}
