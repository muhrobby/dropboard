import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import {
  isScanEnabled,
  getPendingScans,
  getAvailableProvider,
  scanFile,
  scanFileWithClamAV,
} from "@/services/virus-scan-service";
import { getAbsolutePath } from "@/lib/file-storage";

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

    const provider = getAvailableProvider();

    if (provider === "none") {
      return NextResponse.json({
        success: true,
        message: "No scan provider configured. Set VIRUSTOTAL_API_KEY or CLAMAV_HOST/CLAMAV_SOCKET.",
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

    const results: Array<{
      id: string;
      name: string;
      status: string;
      result?: string;
      error?: string;
    }> = [];

    for (const file of pendingFiles) {
      try {
        let scanResult;

        if (provider === "clamav") {
          // ClamAV uses file path directly
          const filePath = getAbsolutePath(file.storagePath);
          scanResult = await scanFileWithClamAV(file.id, filePath);
        } else {
          // VirusTotal needs the file buffer
          const filePath = getAbsolutePath(file.storagePath);
          const fileBuffer = await readFile(filePath);
          scanResult = await scanFile(file.id, Buffer.from(fileBuffer), file.originalName);
        }

        results.push({
          id: file.id,
          name: file.originalName,
          status: scanResult.status,
          result: scanResult.result,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.push({
          id: file.id,
          name: file.originalName,
          status: "error",
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      provider,
      processed: results.length,
      results,
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
      provider: getAvailableProvider(),
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
