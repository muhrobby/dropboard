import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  createTestUser,
  createTestWorkspace,
  createTestItem,
  cleanupTestData,
} from "./helpers/db";
import { searchItems } from "@/services/search-service";

// Mock buildSignedUrl since it's used in search results
vi.mock("@/lib/file-storage", () => ({
  deleteFile: vi.fn().mockResolvedValue(undefined),
  buildSignedUrl: vi.fn((id: string) => `/api/v1/files/${id}?token=mock&expires=999`),
}));

let user: { id: string };
let ws: { id: string };

beforeAll(async () => {
  await cleanupTestData();
  user = await createTestUser({ name: "__test__SearchUser" });
  ws = await createTestWorkspace(user.id, { name: "__test__SearchWs" });

  // Seed searchable items
  await createTestItem({
    workspaceId: ws.id,
    createdBy: user.id,
    type: "note",
    title: "__test__React Hooks Guide",
    content: "Learn about useState and useEffect",
    isPinned: true,
  });
  await createTestItem({
    workspaceId: ws.id,
    createdBy: user.id,
    type: "link",
    title: "__test__TypeScript Docs",
    content: "https://typescriptlang.org",
    note: "Official docs for TypeScript",
    isPinned: true,
  });
  await createTestItem({
    workspaceId: ws.id,
    createdBy: user.id,
    type: "drop",
    title: "__test__Design Mockups",
    note: "Contains wireframes for the React dashboard",
    isPinned: false,
  });
  // Expired item — should NOT appear in search
  await createTestItem({
    workspaceId: ws.id,
    createdBy: user.id,
    type: "drop",
    title: "__test__Expired React Article",
    content: "This should be excluded from search",
    isPinned: false,
    expiresAt: new Date(Date.now() - 1000),
  });
});

afterAll(async () => {
  await cleanupTestData();
});

describe("searchItems", () => {
  it("matches by title (ILIKE)", async () => {
    const result = await searchItems({
      workspaceId: ws.id,
      q: "Hooks",
      page: 1,
      limit: 20,
    });
    expect(result.data.length).toBe(1);
    expect(result.data[0].title).toContain("Hooks");
  });

  it("matches by content (ILIKE)", async () => {
    const result = await searchItems({
      workspaceId: ws.id,
      q: "useState",
      page: 1,
      limit: 20,
    });
    expect(result.data.length).toBe(1);
    expect(result.data[0].content).toContain("useState");
  });

  it("matches by note (ILIKE)", async () => {
    const result = await searchItems({
      workspaceId: ws.id,
      q: "wireframes",
      page: 1,
      limit: 20,
    });
    expect(result.data.length).toBe(1);
    expect(result.data[0].note).toContain("wireframes");
  });

  it("matches across multiple fields (title, note)", async () => {
    const result = await searchItems({
      workspaceId: ws.id,
      q: "React",
      page: 1,
      limit: 20,
    });
    // Should find: "React Hooks Guide" (title) + "Design Mockups" (note contains "React dashboard")
    // Expired "Expired React Article" should be excluded
    expect(result.data.length).toBe(2);
  });

  it("filters by type", async () => {
    const result = await searchItems({
      workspaceId: ws.id,
      q: "React",
      type: "note",
      page: 1,
      limit: 20,
    });
    expect(result.data.length).toBe(1);
    expect(result.data[0].type).toBe("note");
  });

  it("excludes expired items", async () => {
    const result = await searchItems({
      workspaceId: ws.id,
      q: "Expired",
      page: 1,
      limit: 20,
    });
    expect(result.data.length).toBe(0);
  });

  it("paginates correctly", async () => {
    const page1 = await searchItems({
      workspaceId: ws.id,
      q: "__test__",
      page: 1,
      limit: 2,
    });
    const page2 = await searchItems({
      workspaceId: ws.id,
      q: "__test__",
      page: 2,
      limit: 2,
    });
    expect(page1.data.length).toBe(2);
    expect(page2.data.length).toBe(1);
    expect(page1.meta.total).toBe(3); // 3 non-expired items
  });

  it("returns empty when no matches", async () => {
    const result = await searchItems({
      workspaceId: ws.id,
      q: "xyznonexistent",
      page: 1,
      limit: 20,
    });
    expect(result.data.length).toBe(0);
    expect(result.meta.total).toBe(0);
  });
});
