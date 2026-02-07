import { describe, it, expect } from "vitest";
import { requirePermission, hasPermission } from "@/middleware/rbac";
import { PERMISSIONS } from "@/lib/constants";
import { ForbiddenError } from "@/lib/errors";

describe("RBAC - hasPermission", () => {
  describe("owner role", () => {
    it("should have manage_workspace permission", () => {
      expect(hasPermission("owner", PERMISSIONS.MANAGE_WORKSPACE)).toBe(true);
    });

    it("should have manage_members permission", () => {
      expect(hasPermission("owner", PERMISSIONS.MANAGE_MEMBERS)).toBe(true);
    });

    it("should have invite_members permission", () => {
      expect(hasPermission("owner", PERMISSIONS.INVITE_MEMBERS)).toBe(true);
    });

    it("should have view_activity permission", () => {
      expect(hasPermission("owner", PERMISSIONS.VIEW_ACTIVITY)).toBe(true);
    });

    it("should have crud_all_items permission", () => {
      expect(hasPermission("owner", PERMISSIONS.CRUD_ALL_ITEMS)).toBe(true);
    });

    it("should NOT have crud_own_items permission (owners use crud_all)", () => {
      expect(hasPermission("owner", PERMISSIONS.CRUD_OWN_ITEMS)).toBe(false);
    });
  });

  describe("admin role", () => {
    it("should NOT have manage_workspace permission", () => {
      expect(hasPermission("admin", PERMISSIONS.MANAGE_WORKSPACE)).toBe(false);
    });

    it("should NOT have manage_members permission", () => {
      expect(hasPermission("admin", PERMISSIONS.MANAGE_MEMBERS)).toBe(false);
    });

    it("should have invite_members permission", () => {
      expect(hasPermission("admin", PERMISSIONS.INVITE_MEMBERS)).toBe(true);
    });

    it("should have view_activity permission", () => {
      expect(hasPermission("admin", PERMISSIONS.VIEW_ACTIVITY)).toBe(true);
    });

    it("should have crud_all_items permission", () => {
      expect(hasPermission("admin", PERMISSIONS.CRUD_ALL_ITEMS)).toBe(true);
    });
  });

  describe("member role", () => {
    it("should NOT have manage_workspace permission", () => {
      expect(hasPermission("member", PERMISSIONS.MANAGE_WORKSPACE)).toBe(false);
    });

    it("should NOT have manage_members permission", () => {
      expect(hasPermission("member", PERMISSIONS.MANAGE_MEMBERS)).toBe(false);
    });

    it("should NOT have invite_members permission", () => {
      expect(hasPermission("member", PERMISSIONS.INVITE_MEMBERS)).toBe(false);
    });

    it("should NOT have view_activity permission", () => {
      expect(hasPermission("member", PERMISSIONS.VIEW_ACTIVITY)).toBe(false);
    });

    it("should have crud_own_items permission", () => {
      expect(hasPermission("member", PERMISSIONS.CRUD_OWN_ITEMS)).toBe(true);
    });
  });

  describe("unknown role", () => {
    it("should have no permissions for unknown roles", () => {
      expect(hasPermission("unknown" as any, PERMISSIONS.MANAGE_WORKSPACE)).toBe(false);
      expect(hasPermission("unknown" as any, PERMISSIONS.CRUD_OWN_ITEMS)).toBe(false);
    });
  });
});

describe("RBAC - requirePermission", () => {
  it("should not throw when permission is granted", () => {
    expect(() => requirePermission("owner", PERMISSIONS.MANAGE_WORKSPACE)).not.toThrow();
  });

  it("should throw ForbiddenError when permission is denied", () => {
    expect(() => requirePermission("member", PERMISSIONS.MANAGE_WORKSPACE)).toThrow(ForbiddenError);
  });

  it("should include permission name in error message", () => {
    expect(() => requirePermission("member", PERMISSIONS.MANAGE_MEMBERS)).toThrow(
      /manage_members/
    );
  });
});
