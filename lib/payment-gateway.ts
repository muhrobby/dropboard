import { db } from "@/db";
import { paymentGatewayConfig } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface CreateInvoiceParams {
    amount: number;
    description: string;
    externalId: string; // our order ID
    customerEmail: string;
    customerName?: string;
    paymentMethod?: string;
    expiresInHours?: number;
}

export interface Invoice {
    id: string;
    externalId: string;
    amount: number;
    status: string;
    invoiceUrl: string;
    expiresAt: Date;
}

export interface PaymentStatus {
    id: string;
    status: "pending" | "paid" | "expired" | "failed";
    paidAt?: Date;
    paymentMethod?: string;
}

export interface RefundResult {
    id: string;
    status: string;
    amount: number;
}

/**
 * Payment Gateway Interface
 * All payment providers must implement this interface
 */
export interface PaymentGateway {
    provider: "xendit" | "doku";

    createInvoice(params: CreateInvoiceParams): Promise<Invoice>;
    verifyWebhook(request: Request): Promise<boolean>;
    getPaymentStatus(invoiceId: string): Promise<PaymentStatus>;
    refund(paymentId: string, amount: number): Promise<RefundResult>;
}

/**
 * Get the active/primary payment gateway
 */
export async function getActiveGateway(): Promise<PaymentGateway> {
    const config = await db.query.paymentGatewayConfig.findFirst({
        where: and(
            eq(paymentGatewayConfig.isActive, true),
            eq(paymentGatewayConfig.isPrimary, true)
        ),
    });

    if (!config) {
        throw new Error("No active payment gateway configured");
    }

    return createGatewayInstance(config.provider, config.config as Record<string, unknown>);
}

/**
 * Get a specific gateway by provider name
 */
export async function getGateway(provider: "xendit" | "doku"): Promise<PaymentGateway> {
    const config = await db.query.paymentGatewayConfig.findFirst({
        where: and(
            eq(paymentGatewayConfig.provider, provider),
            eq(paymentGatewayConfig.isActive, true)
        ),
    });

    if (!config) {
        throw new Error(`Gateway ${provider} is not configured or not active`);
    }

    return createGatewayInstance(config.provider, config.config as Record<string, unknown>);
}

/**
 * Create gateway instance based on provider
 */
function createGatewayInstance(
    provider: string,
    config: Record<string, unknown>
): PaymentGateway {
    switch (provider) {
        case "xendit":
            return new XenditGateway(config);
        case "doku":
            return new DOKUGateway(config);
        default:
            throw new Error(`Unknown payment gateway provider: ${provider}`);
    }
}

/**
 * Xendit Payment Gateway Implementation
 */
class XenditGateway implements PaymentGateway {
    provider: "xendit" = "xendit";
    private secretKey: string;
    private callbackToken: string;
    private baseUrl = "https://api.xendit.co";

    constructor(config: Record<string, unknown>) {
        this.secretKey = config.secretKey as string;
        this.callbackToken = config.callbackToken as string;
    }

    async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
        const response = await fetch(`${this.baseUrl}/v2/invoices`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${Buffer.from(this.secretKey + ":").toString("base64")}`,
            },
            body: JSON.stringify({
                external_id: params.externalId,
                amount: params.amount,
                description: params.description,
                payer_email: params.customerEmail,
                invoice_duration: (params.expiresInHours || 24) * 3600,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Xendit error: ${error.message || "Unknown error"}`);
        }

        const data = await response.json();
        return {
            id: data.id,
            externalId: data.external_id,
            amount: data.amount,
            status: data.status,
            invoiceUrl: data.invoice_url,
            expiresAt: new Date(data.expiry_date),
        };
    }

    async verifyWebhook(request: Request): Promise<boolean> {
        const callbackToken = request.headers.get("x-callback-token");
        return callbackToken === this.callbackToken;
    }

    async getPaymentStatus(invoiceId: string): Promise<PaymentStatus> {
        const response = await fetch(`${this.baseUrl}/v2/invoices/${invoiceId}`, {
            headers: {
                Authorization: `Basic ${Buffer.from(this.secretKey + ":").toString("base64")}`,
            },
        });

        if (!response.ok) {
            throw new Error("Failed to get payment status");
        }

        const data = await response.json();
        return {
            id: data.id,
            status: data.status.toLowerCase() as PaymentStatus["status"],
            paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
            paymentMethod: data.payment_method,
        };
    }

    async refund(paymentId: string, amount: number): Promise<RefundResult> {
        const response = await fetch(`${this.baseUrl}/refunds`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${Buffer.from(this.secretKey + ":").toString("base64")}`,
            },
            body: JSON.stringify({
                invoice_id: paymentId,
                amount,
                reason: "REQUESTED_BY_CUSTOMER",
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to process refund");
        }

        const data = await response.json();
        return {
            id: data.id,
            status: data.status,
            amount: data.amount,
        };
    }
}

/**
 * DOKU Payment Gateway Implementation
 */
class DOKUGateway implements PaymentGateway {
    provider: "doku" = "doku";
    private clientId: string;
    private secretKey: string;
    private baseUrl = "https://api.doku.com";

    constructor(config: Record<string, unknown>) {
        this.clientId = config.clientId as string;
        this.secretKey = config.secretKey as string;
    }

    private generateSignature(body: string, timestamp: string): string {
        // DOKU signature generation logic
        const crypto = require("crypto");
        const signatureData = `Client-Id:${this.clientId}\nRequest-Timestamp:${timestamp}\nRequest-Target:/checkout/v1/payment\nDigest:${crypto.createHash("sha256").update(body).digest("base64")}`;
        return crypto
            .createHmac("sha256", this.secretKey)
            .update(signatureData)
            .digest("base64");
    }

    async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
        const timestamp = new Date().toISOString();
        const body = JSON.stringify({
            order: {
                invoice_number: params.externalId,
                amount: params.amount,
                callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/doku/notification`,
            },
            customer: {
                email: params.customerEmail,
                name: params.customerName || params.customerEmail,
            },
        });

        const signature = this.generateSignature(body, timestamp);

        const response = await fetch(`${this.baseUrl}/checkout/v1/payment`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Client-Id": this.clientId,
                "Request-Timestamp": timestamp,
                Signature: `HMACSHA256=${signature}`,
            },
            body,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`DOKU error: ${error.message || "Unknown error"}`);
        }

        const data = await response.json();
        return {
            id: data.response.payment.token_id,
            externalId: params.externalId,
            amount: params.amount,
            status: "pending",
            invoiceUrl: data.response.payment.url,
            expiresAt: new Date(Date.now() + (params.expiresInHours || 24) * 3600 * 1000),
        };
    }

    async verifyWebhook(request: Request): Promise<boolean> {
        const clientId = request.headers.get("client-id");
        const signature = request.headers.get("signature");
        const timestamp = request.headers.get("request-timestamp");

        if (!clientId || !signature || !timestamp) return false;
        if (clientId !== this.clientId) return false;

        // Verify signature
        const body = await request.text();
        const expectedSignature = this.generateSignature(body, timestamp);
        return signature === `HMACSHA256=${expectedSignature}`;
    }

    async getPaymentStatus(invoiceId: string): Promise<PaymentStatus> {
        // DOKU status check implementation
        const timestamp = new Date().toISOString();
        const response = await fetch(
            `${this.baseUrl}/orders/v1/status/${invoiceId}`,
            {
                headers: {
                    "Client-Id": this.clientId,
                    "Request-Timestamp": timestamp,
                },
            }
        );

        if (!response.ok) {
            throw new Error("Failed to get payment status");
        }

        const data = await response.json();
        const statusMap: Record<string, PaymentStatus["status"]> = {
            SUCCESS: "paid",
            PENDING: "pending",
            EXPIRED: "expired",
            FAILED: "failed",
        };

        return {
            id: data.order.invoice_number,
            status: statusMap[data.transaction.status] || "pending",
            paidAt: data.transaction.date ? new Date(data.transaction.date) : undefined,
            paymentMethod: data.channel?.id,
        };
    }

    async refund(paymentId: string, amount: number): Promise<RefundResult> {
        // DOKU refund implementation
        const timestamp = new Date().toISOString();
        const body = JSON.stringify({
            order: { invoice_number: paymentId },
            refund: { amount },
        });

        const signature = this.generateSignature(body, timestamp);

        const response = await fetch(`${this.baseUrl}/orders/v1/refund`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Client-Id": this.clientId,
                "Request-Timestamp": timestamp,
                Signature: `HMACSHA256=${signature}`,
            },
            body,
        });

        if (!response.ok) {
            throw new Error("Failed to process refund");
        }

        const data = await response.json();
        return {
            id: data.refund.id,
            status: data.refund.status,
            amount,
        };
    }
}

export { XenditGateway, DOKUGateway };
