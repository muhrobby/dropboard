import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { db } from "@/db";
import { items, fileAssets } from "@/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { getAbsolutePath } from "@/lib/file-storage";
import { serverErrorResponse, validationErrorResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/api-helpers";
import { AppError, ForbiddenError } from "@/lib/errors";
import { z } from "zod";
import archiver from "archiver";
import { createReadStream } from "fs";
import { Readable } from "stream";

const exportSchema = z.object({
  workspaceId: z.string().min(1),
  ids: z.array(z.string().min(1)).min(1).max(100),
});

// POST /api/v1/items/export
// Body: { workspaceId: string, ids: string[] }
// Returns: application/zip stream
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.issues.map((i) => i.message).join(", "),
      );
    }

    const { workspaceId, ids } = parsed.data;
    await requireWorkspaceMembership(session.user.id, workspaceId);

    // Fetch all requested items that belong to this workspace and are not deleted
    const rows = await db
      .select({ item: items, fileAsset: fileAssets })
      .from(items)
      .leftJoin(fileAssets, eq(items.fileAssetId, fileAssets.id))
      .where(
        and(
          eq(items.workspaceId, workspaceId),
          inArray(items.id, ids),
          isNull(items.deletedAt),
        ),
      );

    // Only include items that have an actual file asset
    const fileRows = rows.filter((r) => r.fileAsset !== null);

    if (fileRows.length === 0) {
      return validationErrorResponse("No downloadable files found for the given IDs");
    }

    // Build the ZIP archive via archiver and stream it
    const archive = archiver("zip", { zlib: { level: 6 } });

    // Collect all entries first (to catch errors before streaming starts)
    const entries: { absPath: string; name: string }[] = [];
    const usedNames = new Map<string, number>();

    for (const row of fileRows) {
      const fa = row.fileAsset!;
      const absPath = getAbsolutePath(fa.storagePath);
      let name = fa.originalName || fa.storedName;

      // Deduplicate filenames
      if (usedNames.has(name)) {
        const count = usedNames.get(name)! + 1;
        usedNames.set(name, count);
        const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
        const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
        name = `${base} (${count})${ext}`;
      } else {
        usedNames.set(name, 1);
      }

      entries.push({ absPath, name });
    }

    // Create a ReadableStream from archiver
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    archive.on("data", (chunk: Buffer) => {
      writer.write(new Uint8Array(chunk)).catch(() => {});
    });
    archive.on("end", () => {
      writer.close().catch(() => {});
    });
    archive.on("error", (err: Error) => {
      writer.abort(err).catch(() => {});
    });

    // Append files
    for (const { absPath, name } of entries) {
      archive.file(absPath, { name });
    }

    archive.finalize();

    const totalName = `drops-export-${Date.now()}.zip`;
    return new NextResponse(readable, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${totalName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return forbiddenResponse(error.message);
    if (error instanceof AppError) return unauthorizedResponse(error.message);
    return serverErrorResponse();
  }
}
