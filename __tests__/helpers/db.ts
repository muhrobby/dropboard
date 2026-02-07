/**
 * Test database helpers.
 * Provides seed/cleanup utilities for integration tests that hit the real DB.
 */
import { db } from "@/db";
import {
  users,
  sessions,
  accounts,
  verifications,
  workspaces,
  workspaceMembers,
  items,
  fileAssets,
  invites,
  activityLogs,
} from "@/db/schema";
import { eq, inArray, like, or } from "drizzle-orm";
import { ulid } from "ulid";

// Prefix all test data so we can clean up reliably
const TEST_PREFIX = "__test__";

/**
 * Create a test user directly in the DB (bypasses Better Auth).
 */
export async function createTestUser(overrides: Partial<{
  id: string;
  name: string;
  email: string;
}> = {}) {
  const id = overrides.id ?? ulid();
  const now = new Date();
  const email = overrides.email ?? `${TEST_PREFIX}${id}@test.local`;
  const name = overrides.name ?? `${TEST_PREFIX}User ${id.slice(-4)}`;

  await db.insert(users).values({
    id,
    name,
    email,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  });

  return { id, name, email };
}

/**
 * Create a test workspace with the creator as owner.
 */
export async function createTestWorkspace(
  userId: string,
  overrides: Partial<{
    id: string;
    name: string;
    type: "personal" | "team";
    storageUsedBytes: number;
  }> = {}
) {
  const id = overrides.id ?? ulid();
  const now = new Date();

  await db.insert(workspaces).values({
    id,
    name: overrides.name ?? `${TEST_PREFIX}Workspace`,
    type: overrides.type ?? "team",
    createdBy: userId,
    storageUsedBytes: overrides.storageUsedBytes ?? 0,
    createdAt: now,
    updatedAt: now,
  });

  // Add creator as owner
  await db.insert(workspaceMembers).values({
    id: ulid(),
    workspaceId: id,
    userId,
    role: "owner",
    status: "active",
    joinedAt: now,
  });

  return { id, name: overrides.name ?? `${TEST_PREFIX}Workspace` };
}

/**
 * Add a member to a workspace.
 */
export async function addTestMember(
  workspaceId: string,
  userId: string,
  role: "admin" | "member" = "member"
) {
  const id = ulid();
  const now = new Date();

  await db.insert(workspaceMembers).values({
    id,
    workspaceId,
    userId,
    role,
    status: "active",
    joinedAt: now,
  });

  return { id, workspaceId, userId, role };
}

/**
 * Create a test item directly in the DB.
 */
export async function createTestItem(overrides: {
  workspaceId: string;
  createdBy: string;
  type?: "drop" | "link" | "note";
  title?: string;
  content?: string | null;
  note?: string | null;
  tags?: string[];
  isPinned?: boolean;
  expiresAt?: Date | null;
  fileAssetId?: string | null;
}) {
  const id = ulid();
  const now = new Date();

  await db.insert(items).values({
    id,
    workspaceId: overrides.workspaceId,
    createdBy: overrides.createdBy,
    type: overrides.type ?? "drop",
    title: overrides.title ?? `${TEST_PREFIX}Item`,
    content: overrides.content ?? null,
    note: overrides.note ?? null,
    tags: overrides.tags ?? [],
    isPinned: overrides.isPinned ?? false,
    expiresAt: overrides.expiresAt ?? null,
    fileAssetId: overrides.fileAssetId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return { id };
}

/**
 * Create a test file asset directly in the DB.
 */
export async function createTestFileAsset(overrides: {
  workspaceId: string;
  uploadedBy: string;
  sizeBytes?: number;
  storagePath?: string;
}) {
  const id = ulid();
  const now = new Date();

  await db.insert(fileAssets).values({
    id,
    workspaceId: overrides.workspaceId,
    uploadedBy: overrides.uploadedBy,
    originalName: `${TEST_PREFIX}file.txt`,
    storedName: `${id}.txt`,
    mimeType: "text/plain",
    sizeBytes: overrides.sizeBytes ?? 1024,
    storagePath: overrides.storagePath ?? `uploads/${overrides.workspaceId}/${id}.txt`,
    createdAt: now,
  });

  return { id };
}

/**
 * Clean up ALL test data. Delete in proper FK order.
 * Finds test users by email prefix, then removes all their workspaces
 * (including those created via service functions, not just createTestWorkspace).
 */
export async function cleanupTestData() {
  // Find all test user IDs
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, `${TEST_PREFIX}%`));

  if (testUsers.length === 0) return;

  const testUserIds = testUsers.map((u) => u.id);

  // Find ALL workspaces created by test users (includes service-created ones)
  const testWorkspaces = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(inArray(workspaces.createdBy, testUserIds));

  const testWorkspaceIds = testWorkspaces.map((w) => w.id);

  // Delete in FK order (children first)
  if (testWorkspaceIds.length > 0) {
    await db.delete(activityLogs).where(inArray(activityLogs.workspaceId, testWorkspaceIds));
    await db.delete(invites).where(inArray(invites.workspaceId, testWorkspaceIds));
    await db.delete(items).where(inArray(items.workspaceId, testWorkspaceIds));
    await db.delete(fileAssets).where(inArray(fileAssets.workspaceId, testWorkspaceIds));
    await db.delete(workspaceMembers).where(inArray(workspaceMembers.workspaceId, testWorkspaceIds));
    await db.delete(workspaces).where(inArray(workspaces.id, testWorkspaceIds));
  }

  // Delete test user sessions and accounts
  await db.delete(sessions).where(inArray(sessions.userId, testUserIds));
  await db.delete(accounts).where(inArray(accounts.userId, testUserIds));

  // Now safe to delete test users (no workspaces reference them)
  await db.delete(users).where(inArray(users.id, testUserIds));
}
