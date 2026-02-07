import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, fileAssets } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { processOcr } from "@/services/ocr-service";
import { buildSignedUrl } from "@/lib/file-storage";

// Process pending OCR items
// This endpoint should be called by a cron job
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get items with pending OCR status
    const pendingItems = await db.query.items.findMany({
      where: and(
        eq(items.ocrStatus, "pending"),
        isNull(items.deletedAt)
      ),
      with: {
        fileAsset: true,
      },
      limit: 5, // Process 5 at a time
    });

    if (pendingItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending OCR items",
        processed: 0,
      });
    }

    const results = [];

    for (const item of pendingItems) {
      if (!item.fileAsset) continue;

      try {
        // Get signed URL for the image
        const imageUrl = buildSignedUrl(item.fileAsset.id);

        // Process OCR
        const result = await processOcr(item.id, imageUrl);
        results.push({
          itemId: item.id,
          ...result,
        });
      } catch (error) {
        results.push({
          itemId: item.id,
          success: false,
          error: error instanceof Error ? error.message : "Failed to process",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("OCR cron error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check OCR queue status
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [pendingCount] = await db
      .select({ count: items.id })
      .from(items)
      .where(and(
        eq(items.ocrStatus, "pending"),
        isNull(items.deletedAt)
      ));

    const [processingCount] = await db
      .select({ count: items.id })
      .from(items)
      .where(and(
        eq(items.ocrStatus, "processing"),
        isNull(items.deletedAt)
      ));

    return NextResponse.json({
      success: true,
      queue: {
        pending: pendingCount?.count || 0,
        processing: processingCount?.count || 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
