/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock the dependencies
vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/lib/file-storage", () => ({
  deleteFile: vi.fn(),
}));

import { db } from "@/db";
import { deleteFile } from "@/lib/file-storage";
import { cleanupExpiredItems } from "@/services/cleanup-service";

describe("Cleanup Service (Two-Phase Commit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return early if no expired items are found", async () => {
    const result = await cleanupExpiredItems();
    
    expect(result.deletedItems).toBe(0);
    expect(result.deletedFiles).toBe(0);
    expect(result.freedBytes).toBe(0);
  });

  it("should not delete DB rows if physical file deletion fails", async () => {
    const mockExpiredItems = [
      {
        item: { id: "item-1" },
        fileAsset: { 
          id: "asset-1", 
          storagePath: "/fake/path/file.png", 
          workspaceId: "ws-1", 
          sizeBytes: 1024 
        },
      }
    ];

    // Setup the mock to return one item
    const mockWhere = vi.fn().mockResolvedValue(mockExpiredItems);
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: mockWhere
        })
      })
    });

    // Mock file deletion throwing an unknown error
    (deleteFile as any).mockRejectedValue(new Error("Permission Denied"));

    const result = await cleanupExpiredItems();

    expect(deleteFile).toHaveBeenCalledWith("/fake/path/file.png");
    
    // DB delete should NOT be called
    expect(db.delete).not.toHaveBeenCalled();
    
    // Expect zero items deleted
    expect(result.deletedItems).toBe(0);
    expect(result.deletedFiles).toBe(0);
    expect(result.freedBytes).toBe(0);
  });

  it("should delete DB rows if physical file deletion succeeds", async () => {
    const mockExpiredItems = [
      {
        item: { id: "item-2" },
        fileAsset: { 
          id: "asset-2", 
          storagePath: "/fake/path/file2.png", 
          workspaceId: "ws-2", 
          sizeBytes: 2048 
        },
      }
    ];

    const mockWhere = vi.fn().mockResolvedValue(mockExpiredItems);
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: mockWhere
        })
      })
    });

    // Mock file deletion succeeding
    (deleteFile as any).mockResolvedValue(true);

    const result = await cleanupExpiredItems();

    expect(deleteFile).toHaveBeenCalledWith("/fake/path/file2.png");
    
    // DB delete should be called (once for item, once for fileAsset)
    expect(db.delete).toHaveBeenCalledTimes(2);
    
    // Expect one item deleted
    expect(result.deletedItems).toBe(1);
    expect(result.deletedFiles).toBe(1);
    expect(result.freedBytes).toBe(2048);
  });
});
