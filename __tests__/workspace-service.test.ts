import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestUser,
  createTestWorkspace,
  addTestMember,
  cleanupTestData,
} from "./helpers/db";
import {
  createPersonalWorkspace,
  createTeamWorkspace,
  listUserWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  listMembers,
  updateMemberRole,
  removeMember,
} from "@/services/workspace-service";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

let owner: { id: string; name: string; email: string };
let member: { id: string; name: string; email: string };
let nonMember: { id: string; name: string; email: string };

beforeAll(async () => {
  await cleanupTestData();
  owner = await createTestUser({ name: "__test__WsOwner" });
  member = await createTestUser({ name: "__test__WsMember" });
  nonMember = await createTestUser({ name: "__test__WsNonMember" });
});

afterAll(async () => {
  await cleanupTestData();
});

describe("createPersonalWorkspace", () => {
  it("creates a personal workspace and adds user as owner", async () => {
    const wsId = await createPersonalWorkspace(owner.id, owner.name);
    expect(wsId).toBeDefined();
    expect(typeof wsId).toBe("string");

    const ws = await getWorkspace(wsId);
    expect(ws.type).toBe("personal");
    expect(ws.name).toContain(owner.name);
    expect(ws.createdBy).toBe(owner.id);

    const members = await listMembers(wsId);
    expect(members).toHaveLength(1);
    expect(members[0].userId).toBe(owner.id);
    expect(members[0].role).toBe("owner");
  });
});

describe("createTeamWorkspace", () => {
  it("creates a team workspace and returns it", async () => {
    const ws = await createTeamWorkspace(owner.id, "__test__TeamWs");
    expect(ws).toBeDefined();
    expect(ws.name).toBe("__test__TeamWs");
    expect(ws.type).toBe("team");
    expect(ws.createdBy).toBe(owner.id);

    const members = await listMembers(ws.id);
    expect(members).toHaveLength(1);
    expect(members[0].role).toBe("owner");
  });
});

describe("listUserWorkspaces", () => {
  it("returns workspaces the user belongs to", async () => {
    const list = await listUserWorkspaces(owner.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.every((w) => w.role !== undefined)).toBe(true);
  });

  it("returns empty for a user with no workspaces", async () => {
    const lonely = await createTestUser({ name: "__test__Lonely" });
    const list = await listUserWorkspaces(lonely.id);
    expect(list).toHaveLength(0);
  });
});

describe("getWorkspace", () => {
  it("returns workspace by ID", async () => {
    const ws = await createTeamWorkspace(owner.id, "__test__GetWs");
    const found = await getWorkspace(ws.id);
    expect(found.id).toBe(ws.id);
    expect(found.name).toBe("__test__GetWs");
  });

  it("throws NotFoundError for non-existent workspace", async () => {
    await expect(getWorkspace("NON_EXISTENT_ID")).rejects.toThrow(
      NotFoundError
    );
  });
});

describe("updateWorkspace", () => {
  let teamWs: { id: string };

  beforeAll(async () => {
    teamWs = await createTeamWorkspace(owner.id, "__test__UpdWs");
    await addTestMember(teamWs.id, member.id, "member");
  });

  it("owner can update workspace name", async () => {
    const updated = await updateWorkspace(teamWs.id, owner.id, {
      name: "__test__UpdWsRenamed",
    });
    expect(updated?.name).toBe("__test__UpdWsRenamed");
  });

  it("non-owner cannot update workspace", async () => {
    await expect(
      updateWorkspace(teamWs.id, member.id, { name: "Nope" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("non-member cannot update workspace", async () => {
    await expect(
      updateWorkspace(teamWs.id, nonMember.id, { name: "Nope" })
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("deleteWorkspace", () => {
  it("owner can delete a team workspace", async () => {
    const ws = await createTeamWorkspace(owner.id, "__test__DelWs");
    await deleteWorkspace(ws.id, owner.id);
    await expect(getWorkspace(ws.id)).rejects.toThrow(NotFoundError);
  });

  it("cannot delete personal workspace", async () => {
    const wsId = await createPersonalWorkspace(
      nonMember.id,
      nonMember.name
    );
    await expect(deleteWorkspace(wsId, nonMember.id)).rejects.toThrow(
      ForbiddenError
    );
  });

  it("non-owner cannot delete workspace", async () => {
    const ws = await createTeamWorkspace(owner.id, "__test__DelWs2");
    await addTestMember(ws.id, member.id, "member");
    await expect(deleteWorkspace(ws.id, member.id)).rejects.toThrow(
      ForbiddenError
    );
  });
});

describe("listMembers", () => {
  it("returns members with user info", async () => {
    const ws = await createTeamWorkspace(owner.id, "__test__ListMemWs");
    await addTestMember(ws.id, member.id, "admin");

    const members = await listMembers(ws.id);
    expect(members).toHaveLength(2);

    const ownerMember = members.find((m) => m.userId === owner.id);
    const adminMember = members.find((m) => m.userId === member.id);
    expect(ownerMember?.role).toBe("owner");
    expect(ownerMember?.user.email).toBe(owner.email);
    expect(adminMember?.role).toBe("admin");
  });
});

describe("updateMemberRole", () => {
  let ws: { id: string };

  beforeAll(async () => {
    ws = await createTeamWorkspace(owner.id, "__test__RoleWs");
    await addTestMember(ws.id, member.id, "member");
  });

  it("owner can change member to admin", async () => {
    const updated = await updateMemberRole(
      ws.id,
      member.id,
      owner.id,
      "admin"
    );
    expect(updated?.role).toBe("admin");
  });

  it("cannot change owner role", async () => {
    await expect(
      updateMemberRole(ws.id, owner.id, owner.id, "admin")
    ).rejects.toThrow(ForbiddenError);
  });

  it("cannot assign owner role", async () => {
    await expect(
      updateMemberRole(ws.id, member.id, owner.id, "owner")
    ).rejects.toThrow(ForbiddenError);
  });

  it("non-member cannot change roles", async () => {
    await expect(
      updateMemberRole(ws.id, member.id, nonMember.id, "admin")
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("removeMember", () => {
  it("owner can remove a member", async () => {
    const ws = await createTeamWorkspace(owner.id, "__test__RemMemWs");
    await addTestMember(ws.id, member.id, "member");

    await removeMember(ws.id, member.id, owner.id);
    const members = await listMembers(ws.id);
    expect(members).toHaveLength(1);
    expect(members[0].userId).toBe(owner.id);
  });

  it("cannot remove the workspace owner", async () => {
    const ws = await createTeamWorkspace(owner.id, "__test__RemOwnWs");
    await addTestMember(ws.id, member.id, "admin");

    await expect(removeMember(ws.id, owner.id, member.id)).rejects.toThrow(
      ForbiddenError
    );
  });

  it("non-member cannot remove anyone", async () => {
    const ws = await createTeamWorkspace(owner.id, "__test__RemNonWs");
    await addTestMember(ws.id, member.id, "member");

    await expect(
      removeMember(ws.id, member.id, nonMember.id)
    ).rejects.toThrow(ForbiddenError);
  });
});
