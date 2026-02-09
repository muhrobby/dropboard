import { requireAuth } from "@/middleware/auth-guard";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export class ForbiddenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ForbiddenError";
    }
}

export type UserRole = "user" | "admin" | "super_admin";

export interface AdminSession {
    session: Awaited<ReturnType<typeof requireAuth>>;
    user: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
        emailVerified: boolean;
        image: string | null;
        createdAt: Date;
        updatedAt: Date;
    };
    role: UserRole;
}

/**
 * Require admin or super_admin role
 * Throws ForbiddenError if user is not admin
 */
export async function requireAdmin(): Promise<AdminSession> {
    const session = await requireAuth();

    // Get user with role
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
    });

    if (!user) {
        throw new ForbiddenError("User not found");
    }

    if (user.role !== "admin" && user.role !== "super_admin") {
        throw new ForbiddenError("Admin access required");
    }

    return {
        session,
        user: user as AdminSession["user"],
        role: user.role as UserRole,
    };
}

/**
 * Require super_admin role only
 * Throws ForbiddenError if user is not super_admin
 */
export async function requireSuperAdmin(): Promise<AdminSession> {
    const { session, user } = await requireAdmin();

    if (user.role !== "super_admin") {
        throw new ForbiddenError("Super admin access required");
    }

    return { session, user, role: user.role };
}

/**
 * Check if user has admin role (without throwing)
 */
export async function isAdmin(): Promise<boolean> {
    try {
        await requireAdmin();
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if user has super admin role (without throwing)
 */
export async function isSuperAdmin(): Promise<boolean> {
    try {
        await requireSuperAdmin();
        return true;
    } catch {
        return false;
    }
}
