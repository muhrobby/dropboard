/**
 * Direct DOKU API Test - bypassing our application
 * Run with: npx tsx scripts/test-doku-direct.ts
 */

import { randomBytes, createHash, createHmac } from "crypto";

const DOKU_CONFIG = {
    clientId: "BRN-0242-1770686917691",
    secretKey: "SK-9sQrE6S53W68cmF0vMdD",
};

async function testDOKUDirect() {
    console.log("=".repeat(60));
    console.log("🔍 DOKU DIRECT API TEST");
    console.log("=" + "=".repeat(59));

    const baseUrl = "https://api-sandbox.doku.com";
    const targetPath = "/checkout/v1/payment";

    // Test 1: Basic Request (Minimal - DOKU's example)
    console.log("\n📝 TEST 1: Basic Request (Minimal)");
    console.log("-".repeat(60));

    const timestamp1 = new Date().toISOString();
    const requestId1 = randomBytes(16).toString('hex');

    // Use exact format from DOKU docs - minimal request
    const basicBody = JSON.stringify({
        order: {
            amount: 20000,
            invoice_number: "INV2026021000001",
        },
        payment: {
            payment_due_date: 60,
        },
    });

    const digest1 = createHash("sha256").update(basicBody).digest("base64");
    const signatureData1 = `Client-Id:${DOKU_CONFIG.clientId}\nRequest-Id:${requestId1}\nRequest-Timestamp:${timestamp1}\nRequest-Target:${targetPath}\nDigest:${digest1}`;
    const signature1 = createHmac("sha256", DOKU_CONFIG.secretKey).update(signatureData1).digest("base64");

    console.log("URL:", `${baseUrl}${targetPath}`);
    console.log("Client-ID:", DOKU_CONFIG.clientId);
    console.log("Body:", basicBody);
    console.log("Signature:", signature1.substring(0, 30) + "...");

    const response1 = await fetch(`${baseUrl}${targetPath}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Client-Id": DOKU_CONFIG.clientId,
            "Request-Id": requestId1,
            "Request-Timestamp": timestamp1,
            "Signature": `HMACSHA256=${signature1}`,
        },
        body: basicBody,
    });

    console.log("\nResponse:", response1.status, response1.statusText);
    const text1 = await response1.text();
    console.log("Body:", text1);

    if (response1.status === 200) {
        console.log("\n✅ SUCCESS! Basic request works!");
        console.log("Your DOKU credentials are correct.");
        return true;
    }

    // Test 2: With callback_url
    console.log("\n\n📝 TEST 2: With Callback URL");
    console.log("-".repeat(60));

    const timestamp2 = new Date().toISOString();
    const requestId2 = randomBytes(16).toString('hex');

    const bodyWithCallback = JSON.stringify({
        order: {
            amount: 10000,
            invoice_number: "TEST2026021000001",
            callback_url: "https://example.com/callback",
        },
        payment: {
            payment_due_date: 60,
        },
    });

    const digest2 = createHash("sha256").update(bodyWithCallback).digest("base64");
    const signatureData2 = `Client-Id:${DOKU_CONFIG.clientId}\nRequest-Id:${requestId2}\nRequest-Timestamp:${timestamp2}\nRequest-Target:${targetPath}\nDigest:${digest2}`;
    const signature2 = createHmac("sha256", DOKU_CONFIG.secretKey).update(signatureData2).digest("base64");

    console.log("Body:", bodyWithCallback);

    const response2 = await fetch(`${baseUrl}${targetPath}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Client-Id": DOKU_CONFIG.clientId,
            "Request-Id": requestId2,
            "Request-Timestamp": timestamp2,
            "Signature": `HMACSHA256=${signature2}`,
        },
        body: bodyWithCallback,
    });

    console.log("\nResponse:", response2.status, response2.statusText);
    const text2 = await response2.text();
    console.log("Body:", text2);

    console.log("\n" + "=".repeat(60));
    console.log("ANALISIS:");
    console.log("=".repeat(60));

    if (response1.status === 500 || response2.status === 500) {
        console.log("\n❌ ERROR 500 DARI DOKU");
        console.log("\nIni bukan masalah kode kita, tapi masalah di DOKU:");
        console.log("\n1. Account Sandbox DOKU Anda mungkin BELUM DI-APPROVE");
        console.log("   - Account baru butuh 1-24 jam untuk approval manual");
        console.log("   - Cek email untuk notifikasi approval");
        console.log("\n2. Checkout API belum di-ENABLE");
        console.log("   - Login ke: https://dashboard-sandbox.doku.com");
        console.log("   - Cek menu: Products / Configuration");
        console.log("   - Pastikan 'Checkout API' atau 'JOKUL Checkout' AKTIF");
        console.log("\n3. Salah mengambil Secret Key");
        console.log("   - Harusnya: Shared Key (SK-xxxxxxxx)");
        console.log("   - BUKAN: Client Secret, API Key, atau Webhook Signature");
        console.log("\n4. Account butuh verifikasi KYC");
        console.log("   - Cek apakah ada notifikasi KYC di dashboard");
    }

    return false;
}

testDOKUDirect().catch(console.error);
