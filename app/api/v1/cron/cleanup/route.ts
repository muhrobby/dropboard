import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredItems } from "@/services/cleanup-service";

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;

    if (!expectedToken) {
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "CRON_SECRET not configured" } },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" } },
        { status: 401 }
      );
    }

    const result = await cleanupExpiredItems();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Cron cleanup failed:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Cleanup failed" } },
      { status: 500 }
    );
  }
}
