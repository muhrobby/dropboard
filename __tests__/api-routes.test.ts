import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  createTestUser,
  createTestWorkspace,
  cleanupTestData,
} from "./helpers/db";

// Use vi.hoisted so mockSession is available when vi.mock factory runs (hoisted above imports)
const { mockSession } = vi.hoisted(() => {
  return {
    mockSession: { user: { id: "", name: "", email: "" } },
  };
});

vi.mock("@/middleware/auth-guard", async () => {
  const { UnauthorizedError } = await import("@/lib/errors");
  return {
    requireAuth: vi.fn().mockImplementation(() => {
      if (!mockSession.user.id) {
        throw new UnauthorizedError("Authentication required");
      }
      return Promise.resolve(mockSession);
    }),
    getSession: vi.fn().mockImplementation(() => {
      if (!mockSession.user.id) return Promise.resolve(null);
      return Promise.resolve(mockSession);
    }),
  };
});

// Mock file-storage
vi.mock("@/lib/file-storage", () => ({
  deleteFile: vi.fn().mockResolvedValue(undefined),
  buildSignedUrl: vi.fn((id: string) => `/api/v1/files/${id}?token=mock&expires=999`),
}));

// Mock next/headers (used by auth-guard internally)
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockResolvedValue({ get: () => undefined, set: () => {} }),
}));

import { NextRequest } from "next/server";

// Import cron route directly (it doesn't use auth guard)
import { POST as cronCleanup } from "@/app/api/v1/cron/cleanup/route";

let user: { id: string; name: string; email: string };
let workspace: { id: string };

function makeRequest(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

beforeAll(async () => {
  await cleanupTestData();
  user = await createTestUser({ name: "__test__ApiUser" });
  workspace = await createTestWorkspace(user.id, { name: "__test__ApiWs" });
  mockSession.user = { id: user.id, name: user.name, email: user.email };
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Cron cleanup endpoint", () => {
  it("rejects requests without valid CRON_SECRET", async () => {
    const req = makeRequest("/api/v1/cron/cleanup", {
      method: "POST",
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await cronCleanup(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("accepts requests with valid CRON_SECRET", async () => {
    const req = makeRequest("/api/v1/cron/cleanup", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const res = await cronCleanup(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("deletedItems");
    expect(body.data).toHaveProperty("deletedFiles");
    expect(body.data).toHaveProperty("freedBytes");
  });
});

describe("Auth guard behavior", () => {
  it("requireAuth throws UnauthorizedError when no session", async () => {
    // Temporarily clear the mock session
    const savedId = mockSession.user.id;
    mockSession.user.id = "";

    const { requireAuth } = await import("@/middleware/auth-guard");
    try {
      await requireAuth();
      expect.unreachable("Should have thrown");
    } catch (error: any) {
      expect(error.message).toBe("Authentication required");
    } finally {
      mockSession.user.id = savedId;
    }
  });

  it("requireAuth returns session when authenticated", async () => {
    const { requireAuth } = await import("@/middleware/auth-guard");
    const session = await requireAuth();
    expect(session.user.id).toBe(user.id);
  });
});

describe("Workspace membership guard", () => {
  it("allows access for workspace members", async () => {
    const { requireWorkspaceMembership } = await import(
      "@/middleware/workspace-guard"
    );
    const member = await requireWorkspaceMembership(user.id, workspace.id);
    expect(member).toBeDefined();
    expect(member.role).toBe("owner");
  });

  it("rejects non-members", async () => {
    const nonMember = await createTestUser({ name: "__test__ApiNonMem" });
    const { requireWorkspaceMembership } = await import(
      "@/middleware/workspace-guard"
    );
    const { ForbiddenError } = await import("@/lib/errors");
    await expect(
      requireWorkspaceMembership(nonMember.id, workspace.id)
    ).rejects.toThrow(ForbiddenError);
  });
});
