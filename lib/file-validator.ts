/**
 * File Validator dengan Magic Bytes Detection
 *
 * Modul ini menyediakan validasi file type menggunakan magic bytes
 * (file signatures) untuk mencegah MIME type spoofing.
 *
 * Browser hanya mengirim MIME type berdasarkan file extension,
 * yang bisa di-spoof. Magic bytes detection memastikan file
 * benar-benar memiliki type yang diklaim.
 */

/**
 * Magic bytes untuk berbagai file types
 *
 * Format: [mime type]: { magic: Buffer, offset?: number }
 * offset adalah posisi magic bytes (default: 0)
 */
interface MagicBytesDefinition {
  magic: Buffer;
  offset?: number;
}

const MAGIC_BYTES_MAP: Record<string, MagicBytesDefinition[]> = {
  // Images
  "image/jpeg": [{ magic: Buffer.from([0xFF, 0xD8, 0xFF]) }],
  "image/png": [{ magic: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) }],
  "image/gif": [
    { magic: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) }, // GIF87a
    { magic: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) }, // GIF89a
  ],
  "image/webp": [{ magic: Buffer.from([0x52, 0x49, 0x46, 0x46]), offset: 0 }], // RIFF, need further check
  "image/svg+xml": [
    // SVG is XML, check for XML declaration or svg tag
    { magic: Buffer.from([0x3C, 0x3F, 0x78, 0x6D, 0x6C]) }, // <?xml
    { magic: Buffer.from([0x3C, 0x73, 0x76, 0x67]) }, // <svg
  ],

  // Documents
  "application/pdf": [{ magic: Buffer.from([0x25, 0x50, 0x44, 0x46]) }], // %PDF
  "application/msword": [
    { magic: Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]) }, // DOC (OLE)
  ],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    { magic: Buffer.from([0x50, 0x4B, 0x03, 0x04]) }, // DOCX is ZIP
  ],
  "application/vnd.ms-excel": [
    { magic: Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]) }, // XLS (OLE)
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    { magic: Buffer.from([0x50, 0x4B, 0x03, 0x04]) }, // XLSX is ZIP
  ],
  "application/vnd.ms-powerpoint": [
    { magic: Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]) }, // PPT (OLE)
  ],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    { magic: Buffer.from([0x50, 0x4B, 0x03, 0x04]) }, // PPTX is ZIP
  ],

  // Text (hard to detect, allow based on content)
  "text/plain": [], // No magic bytes, will check if printable ASCII
  "text/csv": [], // No magic bytes, will check if printable ASCII

  // Archives
  "application/zip": [{ magic: Buffer.from([0x50, 0x4B, 0x03, 0x04]) }],
  "application/x-zip-compressed": [{ magic: Buffer.from([0x50, 0x4B, 0x03, 0x04]) }],
};

/**
 * Custom error untuk file validation errors
 */
export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileValidationError";
  }
}

/**
 * Cek apakah buffer berisi printable ASCII text
 *
 * Berguna untuk text/plain dan text/csv yang tidak punya magic bytes
 */
function isPrintableText(buffer: Buffer, sampleSize: number = 1024): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, sampleSize));

  // Cek apakah sebagian besar adalah printable ASCII
  let printableCount = 0;
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    // Printable ASCII: 9-13 (tab, newline, etc), 32-126 (printable)
    if (
      (byte >= 9 && byte <= 13) ||
      (byte >= 32 && byte <= 126) ||
      byte === 0 // Allow null bytes (common in text files)
    ) {
      printableCount++;
    }
  }

  // Jika 90%+ adalah printable ASCII, anggap sebagai text
  return printableCount / sample.length >= 0.9;
}

/**
 * Deteksi MIME type dari buffer menggunakan magic bytes
 *
 * @param buffer - File buffer
 * @param claimedMimeType - MIME type yang diklaim (dari browser)
 * @returns Detected MIME type atau throw error jika tidak valid
 * @throws {FileValidationError} jika file type tidak valid
 */
export function detectMimeType(
  buffer: Buffer,
  claimedMimeType: string
): string {
  // Ambil sample dari file (max 64 bytes untuk magic bytes check)
  const sampleSize = Math.min(buffer.length, 64);
  const sample = buffer.subarray(0, sampleSize);

  // Untuk text files, gunakan heuristik
  if (claimedMimeType === "text/plain" || claimedMimeType === "text/csv") {
    if (!isPrintableText(buffer)) {
      throw new FileValidationError(
        `File is not valid ${claimedMimeType}. Contains binary data.`
      );
    }
    return claimedMimeType;
  }

  // Cek magic bytes untuk claimed MIME type
  const magicDefinitions = MAGIC_BYTES_MAP[claimedMimeType];

  if (!magicDefinitions || magicDefinitions.length === 0) {
    // Tidak ada magic bytes definition, allow
    return claimedMimeType;
  }

  // Cek apakah ada magic bytes yang match
  let matched = false;
  for (const def of magicDefinitions) {
    const offset = def.offset || 0;
    if (sample.length < offset + def.magic.length) {
      continue; // Sample terlalu kecil
    }

    const fileSignature = sample.subarray(offset, offset + def.magic.length);

    if (fileSignature.equals(def.magic)) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    // Cek apakah file ini sebenarnya punya MIME type lain
    const detectedType = detectAnyMimeType(sample);
    throw new FileValidationError(
      `File type mismatch. Claimed to be "${claimedMimeType}" but appears to be "${detectedType}".`
    );
  }

  return claimedMimeType;
}

/**
 * Deteksi MIME type apapun dari magic bytes
 *
 * @param sample - File sample buffer
 * @returns Detected MIME type atau "application/octet-stream"
 */
function detectAnyMimeType(sample: Buffer): string {
  for (const [mimeType, definitions] of Object.entries(MAGIC_BYTES_MAP)) {
    if (definitions.length === 0) continue;

    for (const def of definitions) {
      const offset = def.offset || 0;
      if (sample.length < offset + def.magic.length) {
        continue;
      }

      const fileSignature = sample.subarray(offset, offset + def.magic.length);

      if (fileSignature.equals(def.magic)) {
        return mimeType;
      }
    }
  }

  // Cek untuk text
  if (isPrintableText(sample, sample.length)) {
    return "text/plain";
  }

  return "application/octet-stream";
}

/**
 * Validasi file dengan mendeteksi MIME type dari magic bytes
 *
 * @param file - File object dari FormData
 * @param allowedTypes - Array of allowed MIME types
 * @returns Valid MIME type
 * @throws {FileValidationError} jika validation gagal
 */
export async function validateFileMimeType(
  file: File,
  allowedTypes: string[]
): Promise<string> {
  // Cek claimed MIME type
  if (!allowedTypes.includes(file.type)) {
    throw new FileValidationError(
      `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(", ")}`
    );
  }

  // Baca file untuk magic bytes detection
  const buffer = Buffer.from(await file.arrayBuffer());

  // Deteksi MIME type sebenarnya
  const detectedType = detectMimeType(buffer, file.type);

  // Verifikasi detected type adalah allowed type
  if (!allowedTypes.includes(detectedType)) {
    throw new FileValidationError(
      `File validation failed. Detected type "${detectedType}" is not allowed.`
    );
  }

  return detectedType;
}

/**
 * Quick validation untuk file size dan basic type check
 * Tidak membaca file content
 *
 * @param file - File object
 * @param maxSizeBytes - Maximum file size in bytes
 * @param allowedTypes - Array of allowed MIME types
 * @throws {FileValidationError} jika validation gagal
 */
export function validateFileBasic(
  file: File,
  maxSizeBytes: number,
  allowedTypes: string[]
): void {
  // Cek file size
  if (file.size > maxSizeBytes) {
    throw new FileValidationError(
      `File size ${file.size} bytes exceeds maximum ${maxSizeBytes} bytes`
    );
  }

  // Cek MIME type
  if (!allowedTypes.includes(file.type)) {
    throw new FileValidationError(
      `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(", ")}`
    );
  }
}

/**
 * Sanitasi filename untuk mencegah path traversal dan injection
 *
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Hapus path separators
  let sanitized = filename.replace(/[\/\\]/g, "_");

  // Hanya allow alphanumeric, dash, underscore, dot, space, parenthesis
  sanitized = sanitized.replace(/[^a-zA-Z0-9._() -]/g, "_");

  // Hapus leading dots untuk mencegah hidden files
  sanitized = sanitized.replace(/^\.+/g, "");

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.includes(".")
      ? "." + sanitized.split(".").pop()
      : "";
    const nameWithoutExt = sanitized.substring(0, 255 - ext.length);
    sanitized = nameWithoutExt + ext;
  }

  // Jangan return empty string
  return sanitized || "unnamed_file";
}
