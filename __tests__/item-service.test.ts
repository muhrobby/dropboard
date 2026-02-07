import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  createTestUser,
  createTestWorkspace,
  createTestItem,
  cleanupTestData,
} from "./helpers/db";
import {
  createItem,
  listItems,
  getItem,
  updateItem,
  deleteItem,
  pinItem,
  unpinItem,
} from "@/services/item-service";
import { NotFoundError, QuotaExceededError } from "@/lib/errors";
import { FREE_PINNED_LIMIT, DEFAULT_RETENTION_DAYS } from "@/lib/constants";

// Mock file-storage so deleteItem doesn't try to hit disk
vi.mock("@/lib/file-storage", () => ({
  deleteFile: vi.fn().mockResolvedValue(undefined),
  buildSignedUrl: vi.fn((id: string) => `/api/v1/files/${id}?token=mock&expires=999`),
}));

let user: { id: string; name: string; email: string };
let workspace: { id: string };

beforeAll(async () => {
  await cleanupTestData();
  user = await createTestUser({ name: "__test__ItemOwner" });
  workspace = await createTestWorkspace(user.id, { name: "__test__ItemWs" });
});

afterAll(async () => {
  await cleanupTestData();
});

describe("createItem - drop", () => {
  it("creates a drop with 7-day expiry and not pinned by default", async () => {
    const item = await createItem({
      workspaceId: workspace.id,
      createdBy: user.id,
      type: "drop",
      title: "__test__DropItem",
    });

    expect(item.type).toBe("drop");
    expect(item.isPinned).toBe(false);
    expect(item.expiresAt).toBeDefined();
    expect(item.expiresAt).not.toBeNull();

    // Expiry should be ~7 days from now
    const diffMs = new Date(item.expiresAt!).getTime() - Date.now();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6.9);
    expect(diffDays).toBeLessThan(7.1);
  });

  it("creates a pinned drop with no expiry", async () => {
    const item = await createItem({
      workspaceId: workspace.id,
      createdBy: user.id,
      type: "drop",
      title: "__test__PinnedDrop",
      isPinned: true,
    });

    expect(item.isPinned).toBe(true);
    expect(item.expiresAt).toBeNull();
  });
});

describe("createItem - link", () => {
  it("creates a link that is auto-pinned with no expiry", async () => {
    const item = await createItem({
      workspaceId: workspace.id,
      createdBy: user.id,
      type: "link",
      title: "__test__LinkItem",
      content: "https://example.com",
    });

    expect(item.type).toBe("link");
    expect(item.isPinned).toBe(true);
    expect(item.expiresAt).toBeNull();
  });
});

describe("createItem - note", () => {
  it("creates a note that is auto-pinned with no expiry", async () => {
    const item = await createItem({
      workspaceId: workspace.id,
      createdBy: user.id,
      type: "note",
      title: "__test__NoteItem",
      content: "Some note content",
    });

    expect(item.type).toBe("note");
    expect(item.isPinned).toBe(true);
    expect(item.expiresAt).toBeNull();
  });
});

describe("createItem - quota enforcement", () => {
  let quotaWs: { id: string };
  let quotaUser: { id: string };

  beforeAll(async () => {
    quotaUser = await createTestUser({ name: "__test__QuotaUser" });
    quotaWs = await createTestWorkspace(quotaUser.id, {
      name: "__test__QuotaWs",
    });

    // Insert FREE_PINNED_LIMIT pinned items directly
    const promises = [];
    for (let i = 0; i < FREE_PINNED_LIMIT; i++) {
      promises.push(
        createTestItem({
          workspaceId: quotaWs.id,
          createdBy: quotaUser.id,
          type: "note",
          title: `__test__QuotaItem${i}`,
          isPinned: true,
        })
      );
    }
    await Promise.all(promises);
  });

  it("throws QuotaExceededError when pinned limit is reached", async () => {
    await expect(
      createItem({
        workspaceId: quotaWs.id,
        createdBy: quotaUser.id,
        type: "note",
        title: "__test__OverQuota",
      })
    ).rejects.toThrow(QuotaExceededError);
  });

  it("allows creating unpinned drops even at quota", async () => {
    const item = await createItem({
      workspaceId: quotaWs.id,
      createdBy: quotaUser.id,
      type: "drop",
      title: "__test__UnpinnedDrop",
      isPinned: false,
    });
    expect(item.isPinned).toBe(false);
    expect(item.expiresAt).not.toBeNull();
  });
});

describe("listItems", () => {
  let listWs: { id: string };
  let listUser: { id: string };

  beforeAll(async () => {
    listUser = await createTestUser({ name: "__test__ListUser" });
    listWs = await createTestWorkspace(listUser.id, {
      name: "__test__ListWs",
    });

    // Create various items
    await createTestItem({
      workspaceId: listWs.id,
      createdBy: listUser.id,
      type: "drop",
      title: "__test__ListDrop",
      isPinned: false,
    });
    await createTestItem({
      workspaceId: listWs.id,
      createdBy: listUser.id,
      type: "link",
      title: "__test__ListLink",
      isPinned: true,
    });
    await createTestItem({
      workspaceId: listWs.id,
      createdBy: listUser.id,
      type: "note",
      title: "__test__ListNote",
      isPinned: true,
    });
    // Expired item — should be excluded
    await createTestItem({
      workspaceId: listWs.id,
      createdBy: listUser.id,
      type: "drop",
      title: "__test__ExpiredDrop",
      isPinned: false,
      expiresAt: new Date(Date.now() - 1000), // expired 1s ago
    });
  });

  it("returns items excluding expired", async () => {
    const result = await listItems({
      workspaceId: listWs.id,
      page: 1,
      limit: 20,
    });
    expect(result.data.length).toBe(3); // drop, link, note (not expired)
    expect(result.meta.total).toBe(3);
  });

  it("filters by type", async () => {
    const result = await listItems({
      workspaceId: listWs.id,
      type: "link",
      page: 1,
      limit: 20,
    });
    expect(result.data.length).toBe(1);
    expect(result.data[0].type).toBe("link");
  });

  it("filters by pinned", async () => {
    const result = await listItems({
      workspaceId: listWs.id,
      pinned: true,
      page: 1,
      limit: 20,
    });
    expect(result.data.length).toBe(2); // link + note
    expect(result.data.every((i) => i.isPinned)).toBe(true);
  });

  it("paginates correctly", async () => {
    const page1 = await listItems({
      workspaceId: listWs.id,
      page: 1,
      limit: 2,
    });
    const page2 = await listItems({
      workspaceId: listWs.id,
      page: 2,
      limit: 2,
    });
    expect(page1.data.length).toBe(2);
    expect(page2.data.length).toBe(1);
    expect(page1.meta.total).toBe(3);
  });
});

describe("getItem", () => {
  it("returns an item by ID", async () => {
    const created = await createItem({
      workspaceId: workspace.id,
      createdBy: user.id,
      type: "note",
      title: "__test__GetNote",
      content: "test content",
    });
    const found = await getItem(created.id);
    expect(found.id).toBe(created.id);
    expect(found.title).toBe("__test__GetNote");
  });

  it("throws NotFoundError for non-existent item", async () => {
    await expect(getItem("NONEXISTENT")).rejects.toThrow(NotFoundError);
  });
});

describe("updateItem", () => {
  it("updates title, note, content, tags", async () => {
    const created = await createItem({
      workspaceId: workspace.id,
      createdBy: user.id,
      type: "note",
      title: "__test__UpdNote",
      content: "old content",
    });

    const updated = await updateItem(created.id, {
      title: "__test__UpdNoteRenamed",
      content: "new content",
      note: "a note",
      tags: ["tag1", "tag2"],
    });

    expect(updated.title).toBe("__test__UpdNoteRenamed");
    expect(updated.content).toBe("new content");
    expect(updated.note).toBe("a note");
    expect(updated.tags).toEqual(["tag1", "tag2"]);
  });
});

describe("deleteItem", () => {
  it("deletes an item", async () => {
    const created = await createItem({
      workspaceId: workspace.id,
      createdBy: user.id,
      type: "drop",
      title: "__test__DelDrop",
    });

    await deleteItem(created.id);
    await expect(getItem(created.id)).rejects.toThrow(NotFoundError);
  });
});

describe("pinItem", () => {
  it("pins a drop and clears its expiry", async () => {
    const created = await createItem({
      workspaceId: workspace.id,
      createdBy: user.id,
      type: "drop",
      title: "__test__PinDrop",
    });
    expect(created.isPinned).toBe(false);
    expect(created.expiresAt).not.toBeNull();

    const pinned = await pinItem(created.id);
    expect(pinned.isPinned).toBe(true);
    expect(pinned.expiresAt).toBeNull();
  });

  it("throws QuotaExceededError when pinned limit reached", async () => {
    // Use the quota workspace from earlier — it already has 50 pinned items
    // We need to create a fresh workspace to test this precisely
    const qUser = await createTestUser({ name: "__test__PinQuotaUsr" });
    const qWs = await createTestWorkspace(qUser.id, {
      name: "__test__PinQuotaWs",
    });

    // Fill up pinned quota
    const promises = [];
    for (let i = 0; i < FREE_PINNED_LIMIT; i++) {
      promises.push(
        createTestItem({
          workspaceId: qWs.id,
          createdBy: qUser.id,
          type: "note",
          title: `__test__PinQ${i}`,
          isPinned: true,
        })
      );
    }
    await Promise.all(promises);

    // Create an unpinned drop
    const drop = await createItem({
      workspaceId: qWs.id,
      createdBy: qUser.id,
      type: "drop",
      title: "__test__PinQuotaDrop",
      isPinned: false,
    });

    await expect(pinItem(drop.id)).rejects.toThrow(QuotaExceededError);
  });
});

describe("unpinItem", () => {
  it("unpins a drop and sets 7-day expiry", async () => {
    const created = await createItem({
      workspaceId: workspace.id,
      createdBy: user.id,
      type: "drop",
      title: "__test__UnpinDrop",
      isPinned: true,
    });
    expect(created.isPinned).toBe(true);

    const unpinned = await unpinItem(created.id);
    expect(unpinned.isPinned).toBe(false);
    expect(unpinned.expiresAt).not.toBeNull();

    const diffMs = new Date(unpinned.expiresAt!).getTime() - Date.now();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(6.9);
    expect(diffDays).toBeLessThan(7.1);
  });

  it("does not unpin a link (links stay pinned)", async () => {
    const created = await createItem({
      workspaceId: workspace.id,
      createdBy: user.id,
      type: "link",
      title: "__test__UnpinLink",
      content: "https://example.com",
    });

    const result = await unpinItem(created.id);
    expect(result.isPinned).toBe(true);
    expect(result.expiresAt).toBeNull();
  });

  it("does not unpin a note (notes stay pinned)", async () => {
    const created = await createItem({
      workspaceId: workspace.id,
      createdBy: user.id,
      type: "note",
      title: "__test__UnpinNote",
      content: "content",
    });

    const result = await unpinItem(created.id);
    expect(result.isPinned).toBe(true);
    expect(result.expiresAt).toBeNull();
  });
});
