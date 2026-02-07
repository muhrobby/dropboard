import { db } from "@/db";
import { fileAssets } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";

// Scan status types
export type ScanStatus = "pending" | "scanning" | "clean" | "infected" | "error" | "skipped";

// Scan provider types
export type ScanProvider = "virustotal" | "clamav" | "none";

// Environment check
export function isScanEnabled(): boolean {
  return process.env.VIRUS_SCAN_ENABLED === "true";
}

// Auto-detect available scan provider based on environment variables
export function getAvailableProvider(): ScanProvider {
  // Explicit provider override
  const explicit = process.env.VIRUS_SCAN_PROVIDER;
  if (explicit === "virustotal" && process.env.VIRUSTOTAL_API_KEY) return "virustotal";
  if (explicit === "clamav" && (process.env.CLAMAV_HOST || process.env.CLAMAV_SOCKET)) return "clamav";

  // Auto-detect: prefer ClamAV (faster, local) over VirusTotal (rate-limited API)
  if (process.env.CLAMAV_HOST || process.env.CLAMAV_SOCKET) return "clamav";
  if (process.env.VIRUSTOTAL_API_KEY) return "virustotal";

  return "none";
}

// Queue file for scanning
export async function queueScan(fileAssetId: string) {
  if (!isScanEnabled()) {
    // Mark as skipped if scanning is disabled
    await db
      .update(fileAssets)
      .set({ scanStatus: "skipped" })
      .where(eq(fileAssets.id, fileAssetId));
    return;
  }

  await db
    .update(fileAssets)
    .set({ scanStatus: "pending" })
    .where(eq(fileAssets.id, fileAssetId));
}

// Process scan using VirusTotal API
export async function scanFile(
  fileAssetId: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<{ status: ScanStatus; result?: string }> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;

  if (!apiKey) {
    console.warn("VirusTotal API key not configured, skipping scan");
    await db
      .update(fileAssets)
      .set({
        scanStatus: "skipped",
        scanResult: "API key not configured",
        scannedAt: new Date(),
      })
      .where(eq(fileAssets.id, fileAssetId));
    return { status: "skipped", result: "API key not configured" };
  }

  try {
    // Update status to scanning
    await db
      .update(fileAssets)
      .set({ scanStatus: "scanning" })
      .where(eq(fileAssets.id, fileAssetId));

    // Upload file to VirusTotal
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(fileBuffer)]), fileName);

    const uploadResponse = await fetch("https://www.virustotal.com/api/v3/files", {
      method: "POST",
      headers: {
        "x-apikey": apiKey,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`VirusTotal upload failed: ${uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();
    const analysisId = uploadData.data?.id;

    if (!analysisId) {
      throw new Error("No analysis ID returned from VirusTotal");
    }

    // Poll for results (with timeout)
    const maxAttempts = 30;
    const pollInterval = 10000; // 10 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const analysisResponse = await fetch(
        `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
        {
          headers: {
            "x-apikey": apiKey,
          },
        }
      );

      if (!analysisResponse.ok) {
        continue;
      }

      const analysisData = await analysisResponse.json();
      const status = analysisData.data?.attributes?.status;

      if (status === "completed") {
        const stats = analysisData.data?.attributes?.stats || {};
        const malicious = stats.malicious || 0;
        const suspicious = stats.suspicious || 0;

        if (malicious > 0 || suspicious > 0) {
          await db
            .update(fileAssets)
            .set({
              scanStatus: "infected",
              scanResult: `Detected: ${malicious} malicious, ${suspicious} suspicious`,
              scannedAt: new Date(),
            })
            .where(eq(fileAssets.id, fileAssetId));

          return {
            status: "infected",
            result: `Detected: ${malicious} malicious, ${suspicious} suspicious`,
          };
        }

        await db
          .update(fileAssets)
          .set({
            scanStatus: "clean",
            scanResult: "No threats detected",
            scannedAt: new Date(),
          })
          .where(eq(fileAssets.id, fileAssetId));

        return { status: "clean", result: "No threats detected" };
      }
    }

    // Timeout waiting for results
    throw new Error("Scan timeout - analysis took too long");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db
      .update(fileAssets)
      .set({
        scanStatus: "error",
        scanResult: errorMessage,
        scannedAt: new Date(),
      })
      .where(eq(fileAssets.id, fileAssetId));

    return { status: "error", result: errorMessage };
  }
}

// Alternative: Simple ClamAV scan via clamscan (requires ClamAV installed)
export async function scanFileWithClamAV(
  fileAssetId: string,
  filePath: string
): Promise<{ status: ScanStatus; result?: string }> {
  try {
    // Update status to scanning
    await db
      .update(fileAssets)
      .set({ scanStatus: "scanning" })
      .where(eq(fileAssets.id, fileAssetId));

    // Dynamic import clamscan
    const NodeClam = await import("clamscan").then((m) => m.default);

    const clamscan = await new NodeClam().init({
      removeInfected: false,
      quarantineInfected: false,
      scanLog: null,
      debugMode: false,
      clamdscan: {
        socket: process.env.CLAMAV_SOCKET || "/var/run/clamav/clamd.ctl",
        host: process.env.CLAMAV_HOST || "127.0.0.1",
        port: parseInt(process.env.CLAMAV_PORT || "3310"),
        timeout: 60000,
        localFallback: true,
      },
    });

    const { isInfected, viruses } = await clamscan.isInfected(filePath);

    if (isInfected) {
      const result = `Infected: ${viruses.join(", ")}`;
      await db
        .update(fileAssets)
        .set({
          scanStatus: "infected",
          scanResult: result,
          scannedAt: new Date(),
        })
        .where(eq(fileAssets.id, fileAssetId));

      return { status: "infected", result };
    }

    await db
      .update(fileAssets)
      .set({
        scanStatus: "clean",
        scanResult: "No threats detected",
        scannedAt: new Date(),
      })
      .where(eq(fileAssets.id, fileAssetId));

    return { status: "clean", result: "No threats detected" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Scan failed";

    await db
      .update(fileAssets)
      .set({
        scanStatus: "error",
        scanResult: errorMessage,
        scannedAt: new Date(),
      })
      .where(eq(fileAssets.id, fileAssetId));

    return { status: "error", result: errorMessage };
  }
}

// Get pending scans
export async function getPendingScans(limit = 10) {
  return db.query.fileAssets.findMany({
    where: eq(fileAssets.scanStatus, "pending"),
    limit,
    orderBy: (fa, { asc }) => [asc(fa.createdAt)],
  });
}
