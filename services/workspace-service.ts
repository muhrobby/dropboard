import { db } from "@/db";
import { workspaces, workspaceMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ulid } from "ulid";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { MemberRole } from "@/types";
import { requirePermission } from "@/middleware/rbac";
import { logActivity } from "./activity-service";

export async function createPersonalWorkspace(
  userId: string,
  userName: string
) {
  const workspaceId = ulid();
  const memberId = ulid();
  const now = new Date();

  await db.insert(workspaces).values({
    id: workspaceId,
    name: `${userName}'s Workspace`,
    type: "personal",
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(workspaceMembers).values({
    id: memberId,
    workspaceId,
    userId,
    role: "owner",
    status: "active",
    joinedAt: now,
  });

  return workspaceId;
}

export async function createTeamWorkspace(userId: string, name: string) {
  const workspaceId = ulid();
  const memberId = ulid();
  const now = new Date();

  await db.insert(workspaces).values({
    id: workspaceId,
    name,
    type: "team",
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(workspaceMembers).values({
    id: memberId,
    workspaceId,
    userId,
    role: "owner",
    status: "active",
    joinedAt: now,
  });

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  return workspace!;
}

export async function listUserWorkspaces(userId: string) {
  const members = await db
    .select({
      workspace: workspaces,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.status, "active")
      )
    );

  return members.map((m) => ({
    ...m.workspace,
    role: m.role as MemberRole,
  }));
}

export async function getWorkspace(workspaceId: string) {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace) {
    throw new NotFoundError("Workspace not found");
  }

  return workspace;
}

export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  data: { name: string }
) {
  // Check ownership
  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.status, "active")
    ),
  });

  if (!member || member.role !== "owner") {
    throw new ForbiddenError("Only workspace owner can update settings");
  }

  await db
    .update(workspaces)
    .set({ name: data.name })
    .where(eq(workspaces.id, workspaceId));

  return getWorkspace(workspaceId);
}

export async function deleteWorkspace(workspaceId: string, userId: string) {
  const workspace = await getWorkspace(workspaceId);

  if (workspace.type === "personal") {
    throw new ForbiddenError("Cannot delete personal workspace");
  }

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.status, "active")
    ),
  });

  if (!member || member.role !== "owner") {
    throw new ForbiddenError("Only workspace owner can delete workspace");
  }

  // Cascade delete will remove members
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
}

export async function listMembers(workspaceId: string) {
  const members = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      status: workspaceMembers.status,
      joinedAt: workspaceMembers.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      },
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.status, "active")
      )
    )
    .orderBy(workspaceMembers.joinedAt);

  return members;
}

export async function updateMemberRole(
  workspaceId: string,
  targetUserId: string,
  actorUserId: string,
  newRole: MemberRole
) {
  const actorMember = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, actorUserId),
      eq(workspaceMembers.status, "active")
    ),
  });

  if (!actorMember) {
    throw new ForbiddenError("You are not a member of this workspace");
  }

  requirePermission(actorMember.role, "manage_members");

  const targetMember = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, targetUserId),
      eq(workspaceMembers.status, "active")
    ),
  });

  if (!targetMember) {
    throw new NotFoundError("Target member not found");
  }

  if (targetMember.role === "owner") {
    throw new ForbiddenError("Cannot change owner role");
  }

  if (newRole === "owner") {
    throw new ForbiddenError("Cannot assign owner role");
  }

  await db
    .update(workspaceMembers)
    .set({ role: newRole as "admin" | "member" })
    .where(eq(workspaceMembers.id, targetMember.id));

  logActivity({
    workspaceId,
    actorId: actorUserId,
    action: "MEMBER_ROLE_CHANGED",
    targetType: "member",
    targetId: targetMember.id,
    metadata: { targetUserId, oldRole: targetMember.role, newRole },
  });

  return await db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.id, targetMember.id),
  });
}

export async function removeMember(
  workspaceId: string,
  targetUserId: string,
  actorUserId: string
) {
  const actorMember = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, actorUserId),
      eq(workspaceMembers.status, "active")
    ),
  });

  if (!actorMember) {
    throw new ForbiddenError("You are not a member of this workspace");
  }

  requirePermission(actorMember.role, "manage_members");

  const targetMember = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, targetUserId),
      eq(workspaceMembers.status, "active")
    ),
  });

  if (!targetMember) {
    throw new NotFoundError("Target member not found");
  }

  if (targetMember.role === "owner") {
    throw new ForbiddenError("Cannot remove workspace owner");
  }

  await db
    .delete(workspaceMembers)
    .where(eq(workspaceMembers.id, targetMember.id));

  logActivity({
    workspaceId,
    actorId: actorUserId,
    action: "MEMBER_REMOVED",
    targetType: "member",
    targetId: targetMember.id,
    metadata: { targetUserId, role: targetMember.role },
  });
}
