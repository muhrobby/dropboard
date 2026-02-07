import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestUser,
  createTestWorkspace,
  addTestMember,
  cleanupTestData,
} from "./helpers/db";
import {
  createInvite,
  listInvites,
  getInviteByToken,
  cancelInvite,
  acceptInvite,
} from "@/services/invite-service";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";

let owner: { id: string; name: string; email: string };
let invitee: { id: string; name: string; email: string };
let teamWs: { id: string };
let personalWsId: string;

beforeAll(async () => {
  await cleanupTestData();
  owner = await createTestUser({ name: "__test__InvOwner" });
  invitee = await createTestUser({ name: "__test__InvInvitee" });

  teamWs = await createTestWorkspace(owner.id, {
    name: "__test__InvTeamWs",
    type: "team",
  });

  // Create a personal workspace for negative test
  personalWsId = (
    await createTestWorkspace(owner.id, {
      name: "__test__InvPersonalWs",
      type: "personal",
    })
  ).id;
});

afterAll(async () => {
  await cleanupTestData();
});

describe("createInvite", () => {
  it("creates an invite with pending status and token", async () => {
    const invite = await createInvite(teamWs.id, owner.id, {
      targetIdentifier: "invited@test.local",
      role: "member",
    });

    expect(invite).toBeDefined();
    expect(invite.token).toBeDefined();
    expect(invite.status).toBe("pending");
    expect(invite.workspaceId).toBe(teamWs.id);
    expect(invite.invitedBy).toBe(owner.id);
    expect(invite.role).toBe("member");
    expect(invite.expiresAt).toBeDefined();
    expect(new Date(invite.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects invites to personal workspaces", async () => {
    await expect(
      createInvite(personalWsId, owner.id, {
        targetIdentifier: "someone@test.local",
        role: "member",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("downgrades owner role to admin in invite", async () => {
    const invite = await createInvite(teamWs.id, owner.id, {
      targetIdentifier: "admin@test.local",
      role: "owner",
    });
    // Invite should have role "admin", not "owner"
    expect(invite.role).toBe("admin");
  });
});

describe("listInvites", () => {
  let listWs: { id: string };

  beforeAll(async () => {
    listWs = await createTestWorkspace(owner.id, {
      name: "__test__InvListWs",
      type: "team",
    });
    await createInvite(listWs.id, owner.id, {
      targetIdentifier: "list1@test.local",
      role: "member",
    });
    await createInvite(listWs.id, owner.id, {
      targetIdentifier: "list2@test.local",
      role: "admin",
    });
  });

  it("returns pending, non-expired invites", async () => {
    const invites = await listInvites(listWs.id);
    expect(invites.length).toBe(2);
    expect(invites.every((i) => i.status === "pending")).toBe(true);
  });
});

describe("getInviteByToken", () => {
  it("returns invite for valid token", async () => {
    const created = await createInvite(teamWs.id, owner.id, {
      targetIdentifier: "tokentest@test.local",
      role: "member",
    });

    const found = await getInviteByToken(created.token);
    expect(found.id).toBe(created.id);
    expect(found.token).toBe(created.token);
  });

  it("throws NotFoundError for invalid token", async () => {
    await expect(getInviteByToken("INVALID_TOKEN")).rejects.toThrow(
      NotFoundError
    );
  });
});

describe("cancelInvite", () => {
  it("cancels a pending invite", async () => {
    const created = await createInvite(teamWs.id, owner.id, {
      targetIdentifier: "cancel@test.local",
      role: "member",
    });

    await cancelInvite(teamWs.id, created.id, owner.id);

    // After cancellation, getInviteByToken should fail (status != pending)
    await expect(getInviteByToken(created.token)).rejects.toThrow(
      ValidationError
    );
  });

  it("cannot cancel a non-pending invite", async () => {
    const created = await createInvite(teamWs.id, owner.id, {
      targetIdentifier: "cancel2@test.local",
      role: "member",
    });

    // Cancel it first
    await cancelInvite(teamWs.id, created.id, owner.id);

    // Try cancelling again
    await expect(
      cancelInvite(teamWs.id, created.id, owner.id)
    ).rejects.toThrow(ValidationError);
  });
});

describe("acceptInvite", () => {
  it("adds user as member and marks invite as accepted", async () => {
    const acceptWs = await createTestWorkspace(owner.id, {
      name: "__test__AcceptWs",
      type: "team",
    });

    const invite = await createInvite(acceptWs.id, owner.id, {
      targetIdentifier: invitee.email,
      role: "member",
    });

    const membership = await acceptInvite(invite.token, invitee.id);
    expect(membership).toBeDefined();
    expect(membership?.userId).toBe(invitee.id);
    expect(membership?.workspaceId).toBe(acceptWs.id);
    expect(membership?.role).toBe("member");

    // Invite should no longer be valid
    await expect(getInviteByToken(invite.token)).rejects.toThrow(
      ValidationError
    );
  });

  it("rejects if already a member", async () => {
    const alreadyWs = await createTestWorkspace(owner.id, {
      name: "__test__AlreadyMemWs",
      type: "team",
    });
    await addTestMember(alreadyWs.id, invitee.id, "member");

    const invite = await createInvite(alreadyWs.id, owner.id, {
      targetIdentifier: invitee.email,
      role: "member",
    });

    await expect(acceptInvite(invite.token, invitee.id)).rejects.toThrow(
      ValidationError
    );
  });
});
