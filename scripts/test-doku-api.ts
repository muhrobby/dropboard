/**
 * Standalone DOKU API Integration Test
 * Run with: npx tsx scripts/test-doku-api.ts
 */

import { randomBytes, createHash, createHmac } from "crypto";

// DOKU credentials from database
const DOKU_CONFIG = {
    clientId: "BRN-0242-1770686917691",
    secretKey: "SK-9sQrE6S53W68cmF0vMdD",
    isProduction: false,
};

const DOKU_SANDBOX_URL = "https://api-sandbox.doku.com";

function generateInvoiceNumber(prefix: string): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const randomHex = randomBytes(6).toString('hex').toUpperCase(); // 12 hex chars
    return `${prefix}${dateStr}${randomHex}`;
}

async function testDOKUConnection() {
    console.log("🧪 DOKU API Integration Test");
    console.log("=====================================\n");

    const timestamp = new Date().toISOString();
    const requestId = randomBytes(16).toString('hex');
    const targetPath = "/checkout/v1/payment";

    // Generate invoice number: TEST + YYYYMMDD + 12 hex chars
    const invoiceNumber = generateInvoiceNumber("TEST");

    console.log("📝 Test Details:");
    console.log("  Environment: Sandbox");
    console.log("  Client ID:", DOKU_CONFIG.clientId);
    console.log("  Invoice Number:", invoiceNumber);
    console.log("  Request ID:", requestId);
    console.log("  Timestamp:", timestamp);
    console.log("");

    // Build request body according to DOKU docs
    const requestBody = {
        order: {
            amount: 10000,
            invoice_number: invoiceNumber,
            callback_url: "https://example.com/callback",
            auto_redirect: true,
        },
        payment: {
            payment_due_date: 60,
        },
        customer: {
            name: "Test User",
            email: "test@example.com",
        },
    };

    const body = JSON.stringify(requestBody, null, 2);

    console.log("📤 Request Body:");
    console.log(body);
    console.log("");

    // Generate signature
    const digest = createHash("sha256").update(body).digest("base64");
    const signatureData = `Client-Id:${DOKU_CONFIG.clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${digest}`;
    const signature = createHmac("sha256", DOKU_CONFIG.secretKey).update(signatureData).digest("base64");

    console.log("🔐 Signature Components:");
    console.log("  Digest:", digest);
    console.log("  Signature:", signature.substring(0, 30) + "...");
    console.log("");

    // Make API call
    console.log("🌐 Calling DOKU API...");
    const response = await fetch(`${DOKU_SANDBOX_URL}${targetPath}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Client-Id": DOKU_CONFIG.clientId,
            "Request-Id": requestId,
            "Request-Timestamp": timestamp,
            "Signature": `HMACSHA256=${signature}`,
        },
        body,
    });

    const responseText = await response.text();

    console.log("");
    console.log("📥 Response:");
    console.log("  Status:", response.status, response.statusText);

    let responseData;
    try {
        responseData = JSON.parse(responseText);
        console.log("  Body:", JSON.stringify(responseData, null, 2));
    } catch {
        console.log("  Raw:", responseText);
    }

    console.log("");
    console.log("=====================================");

    // Analyze result
    if (response.status === 200) {
        if (responseData.response?.payment?.url) {
            console.log("✅ SUCCESS - DOKU API is working!");
            console.log("");
            console.log("Payment URL:", responseData.response.payment.url);
            console.log("Token ID:", responseData.response.payment.token_id);
            console.log("");
            console.log("Your DOKU credentials are correct. The integration should work.");
            return true;
        } else {
            console.log("⚠️  UNEXPECTED - Got 200 but response format is unexpected");
            console.log("Expected: response.payment.url");
            return false;
        }
    } else if (response.status === 401) {
        console.log("❌ AUTHENTICATION FAILED (401)");
        console.log("");
        console.log("Possible causes:");
        console.log("  1. Wrong Client ID or Secret Key");
        console.log("  2. Using Production keys in Sandbox");
        console.log("  3. Secret Key format is incorrect");
        console.log("");
        console.log("Please check your DOKU Dashboard at:");
        console.log("  https://dashboard-sandbox.doku.com");
        console.log("");
        console.log("Go to: Credentials → Checkout API");
        console.log("Use: Shared Key (NOT Client Secret or API Key)");
        return false;
    } else if (response.status === 500) {
        console.log("❌ INTERNAL SERVER ERROR (500)");
        console.log("");
        console.log("Possible causes:");
        console.log("  1. Checkout API not enabled in your DOKU account");
        console.log("  2. Account not yet activated/verified");
        console.log("  3. Wrong Secret Key type");
        console.log("");
        console.log("Please check:");
        console.log("  1. Your DOKU account has Checkout API enabled");
        console.log("  2. Your account is verified/active");
        console.log("  3. You're using the correct Shared Key");
        return false;
    } else {
        console.log("❌ ERROR (" + response.status + ")");
        console.log("");
        console.log("Unexpected response. Please check the response body above.");
        return false;
    }
}

// Run the test
testDOKUConnection()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error("❌ Test failed with exception:", error);
        process.exit(1);
    });
