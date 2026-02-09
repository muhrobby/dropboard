import { NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { unauthorizedResponse, serverErrorResponse } from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";
import { getPermissions } from "@/lib/permissions";
import type { UserRole } from "@/middleware/admin-guard";

/**
 * GET /api/v1/me
 * Get current authenticated user information including role and permissions
 */
export async function GET() {
    try {
        const session = await requireAuth();

        // Get full user data including role
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id),
        });

        if (!user) {
            return unauthorizedResponse("User not found");
        }

        // Get permissions for user's role
        const permissions = getPermissions(user.role as UserRole);

        return NextResponse.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
                image: user.image,
                role: user.role,
                permissions,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    } catch (error) {
        console.error("Error fetching current user:", error);

        if (error instanceof AppError) {
            return unauthorizedResponse(error.message);
        }

        return serverErrorResponse("Failed to fetch user information");
    }
}
