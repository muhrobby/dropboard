import { type NextRequest, NextResponse } from "next/server";
import {
  isScanEnabled,
  getPendingScans,
} from "@/services/virus-scan-service";

// Process pending virus scans
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

    if (!isScanEnabled()) {
      return NextResponse.json({
        success: true,
        message: "Virus scanning is disabled",
        processed: 0,
      });
    }

    // Get pending scans
    const pendingFiles = await getPendingScans(5);

    if (pendingFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending scans",
        processed: 0,
      });
    }

    // Note: Actual scanning requires clamscan or VirusTotal API setup
    // This endpoint returns the pending files for now
    return NextResponse.json({
      success: true,
      message: "Scan endpoint ready - configure VIRUS_SCAN_ENABLED and scanner",
      pending: pendingFiles.length,
      files: pendingFiles.map(f => ({ id: f.id, name: f.originalName })),
    });
  } catch (error) {
    console.error("Scan cron error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check scan status
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

    const pendingFiles = await getPendingScans(100);

    return NextResponse.json({
      success: true,
      enabled: isScanEnabled(),
      queue: {
        pending: pendingFiles.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
