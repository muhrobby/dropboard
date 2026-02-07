import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { ulid } from "ulid";
import type { ActivityAction } from "@/types";

export async function logActivity(data: {
  workspaceId: string;
  actorId: string;
  action: ActivityAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(activityLogs).values({
      id: ulid(),
      workspaceId: data.workspaceId,
      actorId: data.actorId,
      action: data.action,
      targetType: data.targetType || null,
      targetId: data.targetId || null,
      metadata: data.metadata || null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export async function listActivity(
  workspaceId: string,
  pagination: { page: number; limit: number }
) {
  const offset = (pagination.page - 1) * pagination.limit;

  const [logs, countResult] = await Promise.all([
    db
      .select({
        id: activityLogs.id,
        workspaceId: activityLogs.workspaceId,
        actorId: activityLogs.actorId,
        action: activityLogs.action,
        targetType: activityLogs.targetType,
        targetId: activityLogs.targetId,
        metadata: activityLogs.metadata,
        createdAt: activityLogs.createdAt,
        actor: {
          name: users.name,
          email: users.email,
          image: users.image,
        },
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.actorId, users.id))
      .where(eq(activityLogs.workspaceId, workspaceId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(pagination.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(activityLogs)
      .where(eq(activityLogs.workspaceId, workspaceId)),
  ]);

  const total = countResult[0]?.count ?? 0;

  return {
    logs,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}
