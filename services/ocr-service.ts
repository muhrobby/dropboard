import { db } from "@/db";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";

// OCR-able image types
const OCR_SUPPORTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
];

export function isOcrSupported(mimeType: string): boolean {
  return OCR_SUPPORTED_TYPES.includes(mimeType.toLowerCase());
}

// Mark item for OCR processing
export async function queueOcr(itemId: string) {
  await db
    .update(items)
    .set({
      ocrStatus: "pending",
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId));
}

// Process OCR for an item
export async function processOcr(itemId: string, imageUrl: string) {
  try {
    // Dynamic import to avoid loading Tesseract on every request
    const Tesseract = await import("tesseract.js");

    // Update status to processing
    await db
      .update(items)
      .set({
        ocrStatus: "processing",
        updatedAt: new Date(),
      })
      .where(eq(items.id, itemId));

    // Perform OCR
    const result = await Tesseract.recognize(imageUrl, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const text = result.data.text.trim();

    // Update item with extracted text
    await db
      .update(items)
      .set({
        ocrText: text || null,
        ocrStatus: "completed",
        updatedAt: new Date(),
      })
      .where(eq(items.id, itemId));

    return { success: true, text };
  } catch (error) {
    console.error("OCR processing failed:", error);

    // Mark as failed
    await db
      .update(items)
      .set({
        ocrStatus: "failed",
        updatedAt: new Date(),
      })
      .where(eq(items.id, itemId));

    return { success: false, error: error instanceof Error ? error.message : "OCR failed" };
  }
}

// Retry OCR for failed items
export async function retryOcr(itemId: string) {
  await db
    .update(items)
    .set({
      ocrStatus: "pending",
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId));
}

// Clear OCR data
export async function clearOcr(itemId: string) {
  await db
    .update(items)
    .set({
      ocrText: null,
      ocrStatus: null,
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId));
}
