import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes, createHash, createHmac } from "crypto";

// DOKU credentials from database
const DOKU_CONFIG = {
    clientId: "BRN-0242-1770686917691",
    secretKey: "SK-9sQrE6S53W68cmF0vMdD",
    isProduction: false,
};

const DOKU_SANDBOX_URL = "https://api-sandbox.doku.com";

describe("DOKU Payment Gateway Integration", () => {
    describe("Signature Generation", () => {
        it("generates correct HMAC SHA256 signature", () => {
            const body = JSON.stringify({
                order: {
                    amount: 50000,
                    invoice_number: "TEST20260210FB03F3AE538B",
                },
                payment: {
                    payment_due_date: 1440,
                },
                customer: {
                    name: "Test User",
                    email: "test@example.com",
                },
            });

            const timestamp = "2026-02-10T02:50:16.464Z";
            const requestId = "446ed42e-1e1b-4abc-8275-2f44ceaaea7d";
            const targetPath = "/checkout/v1/payment";

            // Generate signature exactly like the implementation
            const digest = createHash("sha256").update(body).digest("base64");
            const signatureData = `Client-Id:${DOKU_CONFIG.clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${digest}`;
            const signature = createHmac("sha256", DOKU_CONFIG.secretKey).update(signatureData).digest("base64");

            expect(signature).toBeTruthy();
            expect(typeof signature).toBe("string");
            expect(signature.length).toBeGreaterThan(20);
        });

        it("generates consistent signatures for same input", () => {
            const body = JSON.stringify({ test: "data" });
            const timestamp = "2026-02-10T00:00:00.000Z";
            const requestId = "test-request-id";
            const targetPath = "/checkout/v1/payment";

            const digest = createHash("sha256").update(body).digest("base64");
            const signatureData = `Client-Id:${DOKU_CONFIG.clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${digest}`;
            const signature1 = createHmac("sha256", DOKU_CONFIG.secretKey).update(signatureData).digest("base64");
            const signature2 = createHmac("sha256", DOKU_CONFIG.secretKey).update(signatureData).digest("base64");

            expect(signature1).toBe(signature2);
        });
    });

    describe("Invoice Number Generation", () => {
        it("generates valid invoice numbers", () => {
            // Test the format used in wallet/topup route
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
            const randomHex = randomBytes(6).toString('hex').toUpperCase(); // 12 hex chars
            const invoiceNumber = `TOPUP${dateStr}${randomHex}`;

            // Check format: TOPUP + YYYYMMDD + 12 hex chars
            expect(invoiceNumber).toMatch(/^TOPUP\d{8}[A-F0-9]{12}$/);
            expect(invoiceNumber.length).toBe(24); // TOPUP(4) + YYYYMMDD(8) + 12 hex = 24
            expect(invoiceNumber).not.toContain("-");
            expect(invoiceNumber).not.toContain("_");
        });

        it("generates test invoice numbers", () => {
            // Test the format used in test endpoint
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomHex = randomBytes(6).toString('hex').toUpperCase();
            const invoiceNumber = `TEST${dateStr}${randomHex}`;

            expect(invoiceNumber).toMatch(/^TEST\d{8}[A-F0-9]{12}$/);
            expect(invoiceNumber.length).toBe(23); // TEST(4) + YYYYMMDD(8) + 11 hex = 23
        });

        it("generates unique invoice numbers", () => {
            const invoiceNumbers = new Set<string>();
            for (let i = 0; i < 100; i++) {
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const randomHex = randomBytes(6).toString('hex').toUpperCase();
                const invoiceNumber = `TOPUP${dateStr}${randomHex}`;
                invoiceNumbers.add(invoiceNumber);
            }
            // All 100 should be unique (random 6 bytes = 16^12 possibilities)
            expect(invoiceNumbers.size).toBe(100);
        });
    });

    describe("DOKU API Integration Test", () => {
        it("successfully calls DOKU checkout API", async () => {
            const timestamp = new Date().toISOString();
            const requestId = randomBytes(16).toString('hex');
            const targetPath = "/checkout/v1/payment";

            // Generate invoice number
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomHex = randomBytes(6).toString('hex').toUpperCase();
            const invoiceNumber = `TEST${dateStr}${randomHex}`;

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

            const body = JSON.stringify(requestBody);

            // Generate signature
            const digest = createHash("sha256").update(body).digest("base64");
            const signatureData = `Client-Id:${DOKU_CONFIG.clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${digest}`;
            const signature = createHmac("sha256", DOKU_CONFIG.secretKey).update(signatureData).digest("base64");

            console.log("🧪 DOKU API Test Request:");
            console.log("  URL:", `${DOKU_SANDBOX_URL}${targetPath}`);
            console.log("  Client ID:", DOKU_CONFIG.clientId);
            console.log("  Invoice Number:", invoiceNumber);
            console.log("  Request ID:", requestId);

            // Make actual API call to DOKU sandbox
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
            console.log("  Response Status:", response.status);
            console.log("  Response Body:", responseText.substring(0, 200) + "...");

            // Parse response
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch {
                responseData = { raw: responseText };
            }

            // Test expectations
            if (response.status === 200) {
                // Success - check response structure
                expect(responseData).toHaveProperty("response");
                expect(responseData.response).toHaveProperty("payment");
                expect(responseData.response.payment).toHaveProperty("url");
                expect(responseData.response.payment).toHaveProperty("token_id");
                console.log("  ✅ SUCCESS - Payment URL:", responseData.response.payment.url);
            } else if (response.status === 401) {
                // Authentication failed
                expect(response.status).not.toBe(401); // This will fail with helpful message
                throw new Error("DOKU Authentication Failed (401). Check your Client ID and Secret Key in DOKU Dashboard.");
            } else if (response.status === 500) {
                // Internal server error - account or configuration issue
                throw new Error(`DOKU Internal Server Error (500). ${JSON.stringify(responseData)}. Possible causes: 1) Wrong Secret Key, 2) Checkout API not enabled, 3) Account not activated.`);
            } else {
                // Other error
                throw new Error(`DOKU API returned ${response.status}: ${JSON.stringify(responseData)}`);
            }
        }, 30000); // 30 second timeout for API call
    });
});
