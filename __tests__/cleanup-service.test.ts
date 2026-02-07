import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  createTestUser,
  createTestWorkspace,
  createTestItem,
  createTestFileAsset,
  cleanupTestData,
} from "./helpers/db";
import { cleanupExpiredItems } from "@/services/cleanup-service";
import { db } from "@/db";
import { items, fileAssets, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

// Mock deleteFile so it doesn't touch the filesystem
vi.mock("@/lib/file-storage", () => ({
  deleteFile: vi.fn().mockResolvedValue(undefined),
  buildSignedUrl: vi.fn((id: string) => `/api/v1/files/${id}?token=mock&expires=999`),
}));

let user: { id: string };
let ws: { id: string };

beforeAll(async () => {
  await cleanupTestData();
  user = await createTestUser({ name: "__test__CleanupUser" });
  ws = await createTestWorkspace(user.id, {
    name: "__test__CleanupWs",
    storageUsedBytes: 5000,
  });
});

afterAll(async () => {
  await cleanupTestData();
});

describe("cleanupExpiredItems", () => {
  it("deletes expired items and returns count", async () => {
    // Create 2 expired items
    await createTestItem({
      workspaceId: ws.id,
      createdBy: user.id,
      type: "drop",
      title: "__test__ExpClean1",
      expiresAt: new Date(Date.now() - 60000), // expired 1 min ago
    });
    await createTestItem({
      workspaceId: ws.id,
      createdBy: user.id,
      type: "drop",
      title: "__test__ExpClean2",
      expiresAt: new Date(Date.now() - 120000), // expired 2 min ago
    });

    // Create 1 non-expired item
    await createTestItem({
      workspaceId: ws.id,
      createdBy: user.id,
      type: "note",
      title: "__test__NotExpired",
      isPinned: true,
    });

    const result = await cleanupExpiredItems();
    expect(result.deletedItems).toBeGreaterThanOrEqual(2);

    // Verify non-expired items remain
    const remaining = await db
      .select()
      .from(items)
      .where(eq(items.workspaceId, ws.id));
    const nonExpired = remaining.filter((i) => i.title === "__test__NotExpired");
    expect(nonExpired.length).toBe(1);
  });

  it("deletes associated file assets and updates storage", async () => {
    const fileAsset = await createTestFileAsset({
      workspaceId: ws.id,
      uploadedBy: user.id,
      sizeBytes: 2000,
      storagePath: `uploads/${ws.id}/testfile.txt`,
    });

    await createTestItem({
      workspaceId: ws.id,
      createdBy: user.id,
      type: "drop",
      title: "__test__ExpWithFile",
      expiresAt: new Date(Date.now() - 60000),
      fileAssetId: fileAsset.id,
    });

    const result = await cleanupExpiredItems();
    expect(result.deletedFiles).toBeGreaterThanOrEqual(1);
    expect(result.freedBytes).toBeGreaterThanOrEqual(2000);

    // Verify file asset is removed from DB
    const remainingAssets = await db
      .select()
      .from(fileAssets)
      .where(eq(fileAssets.id, fileAsset.id));
    expect(remainingAssets.length).toBe(0);
  });

  it("returns zeros when no expired items exist", async () => {
    // Clean up any existing expired items first
    await cleanupExpiredItems();

    const result = await cleanupExpiredItems();
    expect(result.deletedItems).toBe(0);
    expect(result.deletedFiles).toBe(0);
    expect(result.freedBytes).toBe(0);
  });
});
