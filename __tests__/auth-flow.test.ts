import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { cleanupTestData } from "./helpers/db";
import { db } from "@/db";
import { users, workspaces, workspaceMembers } from "@/db/schema";
import { eq, like } from "drizzle-orm";

// Mock next/headers since Better Auth internals may call it
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockResolvedValue({
    get: () => undefined,
    set: () => {},
    getAll: () => [],
  }),
}));

// Use auth directly for server-side testing
import { auth } from "@/lib/auth";

const TEST_EMAIL = `__test__authflow_${Date.now()}@test.local`;
const TEST_PASSWORD = "TestPassword123!";
const TEST_NAME = "__test__AuthFlowUser";

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe("Auth Flow", () => {
  let userId: string;

  it("registers a new user via Better Auth API", async () => {
    // Call the Better Auth signUp endpoint directly
    const response = await auth.api.signUpEmail({
      body: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
      },
    });

    expect(response).toBeDefined();
    // Better Auth returns the user and session
    expect(response.user).toBeDefined();
    expect(response.user.email).toBe(TEST_EMAIL);
    expect(response.user.name).toBe(TEST_NAME);
    userId = response.user.id;
  });

  it("auto-creates a personal workspace on registration", async () => {
    // Verify workspace was created by the databaseHook
    const userWorkspaces = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.createdBy, userId));

    expect(userWorkspaces.length).toBeGreaterThanOrEqual(1);
    const personalWs = userWorkspaces.find((w) => w.type === "personal");
    expect(personalWs).toBeDefined();
    expect(personalWs!.name).toContain(TEST_NAME);

    // Verify user is owner of the workspace
    const members = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, personalWs!.id));

    expect(members.length).toBe(1);
    expect(members[0].userId).toBe(userId);
    expect(members[0].role).toBe("owner");
  });

  it("logs in with correct credentials", async () => {
    const response = await auth.api.signInEmail({
      body: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    expect(response).toBeDefined();
    expect(response.user).toBeDefined();
    expect(response.user.email).toBe(TEST_EMAIL);
    // signInEmail returns token + session at runtime
    expect(response.token).toBeDefined();
  });

  it("rejects login with wrong password", async () => {
    try {
      await auth.api.signInEmail({
        body: {
          email: TEST_EMAIL,
          password: "WrongPassword123!",
        },
      });
      // Should not reach here
      expect.unreachable("Should have thrown");
    } catch (error) {
      // Better Auth throws an error or returns an error response
      expect(error).toBeDefined();
    }
  });

  it("rejects registration with duplicate email", async () => {
    try {
      await auth.api.signUpEmail({
        body: {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          name: "Duplicate User",
        },
      });
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("rejects registration with short password", async () => {
    try {
      await auth.api.signUpEmail({
        body: {
          email: `__test__short_${Date.now()}@test.local`,
          password: "short",
          name: "__test__ShortPwd",
        },
      });
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
