"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireSuperAdmin } from "@/middleware/admin-guard";

/**
 * Server Action to securely update a user's role and handle session management.
 * Only Super Admins can execute this action.
 */
export async function updateUserRole(userId: string, newRole: "user" | "admin" | "super_admin") {
  try {
    // 1. Strict Server-Side Role Verification
    // Ensure only a super_admin can change roles
    await requireSuperAdmin();

    if (!["user", "admin", "super_admin"].includes(newRole)) {
      return { success: false, error: "Invalid role specified" };
    }

    // 2. Update Role in Database
    await db.update(users)
      .set({ role: newRole })
      .where(eq(users.id, userId));

    // 3. Prevent Stale Sessions (Security Measure)
    // When a user's permissions change significantly (especially downgrades or admin upgrades),
    // it's a best practice to invalidate their current active sessions to force a token refresh.
    // Better Auth will require them to log in again and fetch the fresh role from the DB.
    await db.delete(sessions).where(eq(sessions.userId, userId));

    // 4. Invalidate Next.js Server Caches
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/users");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update user role:", error);
    if (error.name === "ForbiddenError") {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred while updating the role" };
  }
}
