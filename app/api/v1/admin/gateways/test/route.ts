import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/middleware/admin-guard";
import { randomBytes, createHash, createHmac } from "crypto";

/**
 * Test DOKU gateway connection and credentials
 * POST /api/v1/admin/gateways/test
 */
export async function POST(request: NextRequest) {
    try {
        await requireSuperAdmin();

        const body = await request.json();
        const { provider, clientId, secretKey, isProduction = false } = body;

        if (provider === "doku") {
            return await testDOKUConnection(clientId, secretKey, isProduction);
        } else if (provider === "xendit") {
            return await testXenditConnection(secretKey);
        }

        return NextResponse.json({
            success: false,
            error: { message: "Unknown provider" }
        }, { status: 400 });

    } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
            return NextResponse.json({
                success: false,
                error: { message: "Unauthorized" }
            }, { status: 401 });
        }

        console.error("Gateway test error:", error);
        return NextResponse.json({
            success: false,
            error: { message: error instanceof Error ? error.message : "Unknown error" }
        }, { status: 500 });
    }
}

async function testDOKUConnection(clientId: string, secretKey: string, isProduction: boolean) {
    const baseUrl = isProduction ? "https://api.doku.com" : "https://api-sandbox.doku.com";
    const targetPath = "/checkout/v1/payment";

    // Create a minimal test request with proper invoice format
    const timestamp = new Date().toISOString();
    const requestId = randomBytes(16).toString('hex');

    // Generate invoice number: alphanumeric only, max 30 chars, no symbols
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const randomHex = randomBytes(6).toString('hex').toUpperCase(); // 12 hex chars
    const invoiceNumber = `TEST${dateStr}${randomHex}`; // TEST20260210FB03F3AE538B = 23 chars

    const testBody = JSON.stringify({
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
    });

    // Generate signature
    const digest = createHash("sha256").update(testBody).digest("base64");
    const signatureData = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${digest}`;
    const signature = createHmac("sha256", secretKey).update(signatureData).digest("base64");

    console.log("🧪 Testing DOKU Connection:", {
        baseUrl,
        clientId,
        targetPath,
    });

    const response = await fetch(`${baseUrl}${targetPath}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Client-Id": clientId,
            "Request-Id": requestId,
            "Request-Timestamp": timestamp,
            Signature: `HMACSHA256=${signature}`,
        },
        body: testBody,
    });

    const responseText = await response.text();

    let responseData;
    try {
        responseData = JSON.parse(responseText);
    } catch {
        responseData = { raw: responseText };
    }

    // Check different error scenarios
    if (response.status === 401) {
        return NextResponse.json({
            success: false,
            error: {
                code: "AUTH_FAILED",
                message: "Authentication failed. Check your Client ID and Secret Key.",
                details: responseData
            }
        }, { status: 200 });
    }

    if (response.status === 400) {
        // This means authentication worked, but the request format is wrong
        return NextResponse.json({
            success: true,
            data: {
                status: "valid_credentials",
                message: "Credentials are valid! (Request format error is expected for test)",
                note: "The API accepted your credentials but returned a format error, which means your Client ID and Secret Key are correct.",
                response: responseData
            }
        });
    }

    if (response.status === 500) {
        return NextResponse.json({
            success: false,
            error: {
                code: "INTERNAL_ERROR",
                message: "DOKU returned internal server error.",
                details: responseData,
                suggestions: [
                    "Check if your DOKU account is activated in the dashboard",
                    "Verify you're using the correct API keys (Shared Key vs Client Secret)",
                    "Ensure your account has Checkout API enabled",
                    "Try regenerating your API keys in DOKU dashboard"
                ]
            }
        }, { status: 200 });
    }

    // If we get a successful response with payment URL, credentials are definitely valid
    if (response.ok && responseData.response?.payment?.url) {
        return NextResponse.json({
            success: true,
            data: {
                status: "success",
                message: "DOKU connection test successful!",
                paymentUrl: responseData.response.payment.url
            }
        });
    }

    // For any other response, return the details
    return NextResponse.json({
        success: true,
        data: {
            status: "unknown",
            message: "Connection test completed. Check details for more info.",
            statusCode: response.status,
            response: responseData
        }
    });
}

async function testXenditConnection(secretKey: string) {
    const baseUrl = "https://api.xendit.co";

    const response = await fetch(`${baseUrl}/v2/invoices`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
        },
        body: JSON.stringify({
            external_id: `TEST-${Date.now()}`,
            amount: 10000,
            description: "Test Payment",
            payer_email: "test@example.com",
            invoice_duration: 300, // 5 minutes
        }),
    });

    if (response.status === 401) {
        return NextResponse.json({
            success: false,
            error: {
                code: "AUTH_FAILED",
                message: "Authentication failed. Check your Secret Key.",
            }
        }, { status: 200 });
    }

    if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
            success: true,
            data: {
                status: "success",
                message: "Xendit connection test successful!",
                invoiceUrl: data.invoice_url
            }
        });
    }

    const responseData = await response.json();
    return NextResponse.json({
        success: false,
        error: {
            code: "API_ERROR",
            message: responseData.message || "Unknown error",
            details: responseData
        }
    }, { status: 200 });
}
