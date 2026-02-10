/**
 * DOKU API Debug Tool
 * Untuk membantu mengidentifikasi masalah integrasi DOKU
 */

import { randomBytes, createHash, createHmac } from "crypto";

// DOKU credentials
const DOKU_CONFIG = {
    clientId: "BRN-0242-1770686917691",
    secretKey: "SK-9sQrE6S53W68cmF0vMdD",
};

console.log("=".repeat(60));
console.log("🔍 DOKU INTEGRATION DEBUG TOOL");
console.log("=".repeat(60));

console.log("\n1. CREDENTIAL CHECK:");
console.log("   Client ID:", DOKU_CONFIG.clientId);
console.log("   Client ID format:", DOKU_CONFIG.clientId.startsWith("BRN-0242-") ? "✅ Sandbox format" : "❌ Wrong format");
console.log("   Secret Key:", DOKU_CONFIG.secretKey.substring(0, 10) + "...");
console.log("   Secret Key format:", DOKU_CONFIG.secretKey.startsWith("SK-") ? "✅ Shared Key format" : "❌ Wrong format (should start with SK-)");
console.log("   Secret Key length:", DOKU_CONFIG.secretKey.length, "chars");

console.log("\n2. SIGNATURE GENERATION TEST:");
const timestamp = "2026-02-10T00:00:00.000Z";
const requestId = "test-request-id-12345";
const targetPath = "/checkout/v1/payment";

// Test basic request (DOKU's example)
const basicBody = JSON.stringify({
    order: {
        amount: 20000,
        invoice_number: "INV-20210231-0001",
    },
    payment: {
        payment_due_date: 60,
    },
});

const digest = createHash("sha256").update(basicBody).digest("base64");
const signatureComponents = `Client-Id:${DOKU_CONFIG.clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${digest}`;

console.log("   Body:", basicBody);
console.log("   Digest:", digest);
console.log("   Signature components:", signatureComponents.replace(/\n/g, " | "));
const signature = createHmac("sha256", DOKU_CONFIG.secretKey).update(signatureComponents).digest("base64");
console.log("   Signature:", signature);

console.log("\n3. DOKU DASHBOARD CHECKLIST:");
console.log("   Silakan cek hal-hal berikut di DOKU Dashboard:");
console.log("   ");
console.log("   🔹 Dashboard: https://dashboard-sandbox.doku.com");
console.log("   ");
console.log("   A. CREDENTIALS → CHECKOUT API / JOKUL CHECKOUT");
console.log("      [ ] Client ID: BRN-0242-xxxxxxxxxxxxx");
console.log("      [ ] Shared Key / Secret Key: SK-xxxxxxxxxxxxxxxxxxxx");
console.log("      [ ] JANGAN menggunakan: Client Secret, API Key, atau Webhook Signature");
console.log("   ");
console.log("   B. PRODUCTS / SETTINGS");
console.log("      [ ] Checkout API atau JOKUL Checkout sudah di-ENABLE/AKTIF");
console.log("      [ ] Minimal satu payment method dipilih (VA, QRIS, dll)");
console.log("   ");
console.log("   C. ACCOUNT STATUS");
console.log("      [ ] Account status: ACTIVE (bukan PENDING/SUSPENDED)");
console.log("      [ ] Email sudah terverifikasi");
console.log("      [ ] Dokumen KYC sudah dilengkapi (jika diminta)");

console.log("\n4. COMMON ISSUES:");
console.log("   ❌ Account baru belum verifikasi → Butuh 1-24 jam untuk approval");
console.log("   ❌ Checkout API belum aktif → Hubungi DOKU support");
console.log("   ❌ Salah ambil key → Pastikan SHARED KEY, bukan Client Secret");
console.log("   ❌ Environment salah → Pastikan pakai SANDBOX untuk testing");

console.log("\n5. SOLUTION STEPS:");
console.log("   Step 1: Login ke https://dashboard-sandbox.doku.com");
console.log("   Step 2: Cek menu Credentials → pastikan Checkout API ada");
console.log("   Step 3: Copy Client ID dan Shared Key dengan benar");
console.log("   Step 4: Cek menu Settings/Products → aktifkan Checkout API");
console.log("   Step 5: Jika masih error, hubungi DOKU support:");
console.log("           Email: support@doku.com");
console.log("           WA: +62 21 5080 8800");

console.log("\n6. SCREENSHOT YANG DIBUTUHKAN:");
console.log("   Mohon share screenshot dari DOKU Dashboard yang menunjukkan:");
console.log("   - Halaman Credentials (tapi bagian Shared Key ditutup/dimask)");
console.log("   - Halaman Products/Settings (yang menunjukkan Checkout API)");
console.log("   - Status account (Active/Pending)");

console.log("\n" + "=".repeat(60));
