import { db } from "@/db";
import { invites, workspaceMembers, workspaces } from "@/db/schema";
import { eq, and, desc, gt } from "drizzle-orm";
import { randomBytes } from "crypto";
import { ulid } from "ulid";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { INVITE_EXPIRY_DAYS } from "@/lib/constants";
import type { MemberRole } from "@/types";
import { logActivity } from "./activity-service";

export async function createInvite(
  workspaceId: string,
  invitedBy: string,
  data: { targetIdentifier: string; role: MemberRole }
) {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace) {
    throw new NotFoundError("Workspace not found");
  }

  if (workspace.type !== "team") {
    throw new ValidationError("Cannot invite to personal workspace");
  }

  // 32 random bytes → 64 hex chars (fits varchar(64))
  const token = randomBytes(32).toString("hex");

  const invite = await db
    .insert(invites)
    .values({
      id: ulid(),
      workspaceId,
      invitedBy,
      token,
      targetIdentifier: data.targetIdentifier,
      role: data.role === "owner" ? "admin" : (data.role as "admin" | "member"),
      status: "pending",
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })
    .returning();

  logActivity({
    workspaceId,
    actorId: invitedBy,
    action: "INVITE_SENT",
    targetType: "invite",
    targetId: invite[0].id,
    metadata: { targetIdentifier: data.targetIdentifier, role: data.role },
  });

  return invite[0];
}

export async function listInvites(workspaceId: string) {
  const pendingInvites = await db.query.invites.findMany({
    where: and(
      eq(invites.workspaceId, workspaceId),
      eq(invites.status, "pending"),
      gt(invites.expiresAt, new Date())
    ),
    orderBy: [desc(invites.createdAt)],
  });

  return pendingInvites;
}

export async function getInviteByToken(token: string) {
  const invite = await db.query.invites.findFirst({
    where: eq(invites.token, token),
  });

  if (!invite) {
    throw new NotFoundError("Invite not found or expired");
  }

  if (invite.expiresAt < new Date()) {
    throw new ValidationError("Invite has expired");
  }

  if (invite.status !== "pending") {
    throw new ValidationError("Invite is no longer valid");
  }

  return invite;
}

export async function cancelInvite(
  workspaceId: string,
  inviteId: string,
  userId: string
) {
  const invite = await db.query.invites.findFirst({
    where: eq(invites.id, inviteId),
  });

  if (!invite || invite.workspaceId !== workspaceId) {
    throw new NotFoundError("Invite not found");
  }

  if (invite.status !== "pending") {
    throw new ValidationError("Invite cannot be cancelled");
  }

  await db
    .update(invites)
    .set({ status: "cancelled" })
    .where(eq(invites.id, inviteId));

  logActivity({
    workspaceId,
    actorId: userId,
    action: "INVITE_CANCELLED",
    targetType: "invite",
    targetId: inviteId,
    metadata: { targetIdentifier: invite.targetIdentifier },
  });
}

export async function acceptInvite(token: string, userId: string) {
  const invite = await getInviteByToken(token);

  const existingMember = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, invite.workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });

  if (existingMember) {
    throw new ValidationError("Already a member of this workspace");
  }

  await db.transaction(async (tx) => {
    await tx.insert(workspaceMembers).values({
      id: ulid(),
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role as "admin" | "member",
      status: "active",
      joinedAt: new Date(),
    });

    await tx
      .update(invites)
      .set({ status: "accepted" })
      .where(eq(invites.id, invite.id));
  });

  logActivity({
    workspaceId: invite.workspaceId,
    actorId: userId,
    action: "INVITE_ACCEPTED",
    targetType: "invite",
    targetId: invite.id,
    metadata: { role: invite.role },
  });

  return await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, invite.workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });
}
