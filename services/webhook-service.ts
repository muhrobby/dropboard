import { db } from "@/db";
import { webhooks, webhookLogs, type WebhookEvent } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { randomBytes, createHmac } from "crypto";
import { ulid } from "ulid";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";

// Create a new webhook
export async function createWebhook(
  workspaceId: string,
  userId: string,
  data: {
    name: string;
    url: string;
    events: WebhookEvent[];
  }
) {
  // Validate URL
  try {
    new URL(data.url);
  } catch {
    throw new ValidationError("Invalid webhook URL");
  }

  // Generate secret
  const secret = randomBytes(32).toString("hex");

  const webhook = await db
    .insert(webhooks)
    .values({
      id: ulid(),
      workspaceId,
      name: data.name,
      url: data.url,
      secret,
      events: data.events,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return webhook[0];
}

// Get webhooks for a workspace
export async function getWebhooks(workspaceId: string) {
  return db.query.webhooks.findMany({
    where: eq(webhooks.workspaceId, workspaceId),
    orderBy: (w, { desc }) => [desc(w.createdAt)],
  });
}

// Get a single webhook
export async function getWebhook(webhookId: string, workspaceId: string) {
  const webhook = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, webhookId), eq(webhooks.workspaceId, workspaceId)),
  });

  if (!webhook) {
    throw new NotFoundError("Webhook not found");
  }

  return webhook;
}

// Update a webhook
export async function updateWebhook(
  webhookId: string,
  workspaceId: string,
  data: {
    name?: string;
    url?: string;
    events?: WebhookEvent[];
    isActive?: boolean;
  }
) {
  const webhook = await getWebhook(webhookId, workspaceId);

  if (data.url) {
    try {
      new URL(data.url);
    } catch {
      throw new ValidationError("Invalid webhook URL");
    }
  }

  const updated = await db
    .update(webhooks)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(webhooks.id, webhookId))
    .returning();

  return updated[0];
}

// Delete a webhook
export async function deleteWebhook(webhookId: string, workspaceId: string) {
  await getWebhook(webhookId, workspaceId);
  await db.delete(webhooks).where(eq(webhooks.id, webhookId));
}

// Regenerate webhook secret
export async function regenerateSecret(webhookId: string, workspaceId: string) {
  await getWebhook(webhookId, workspaceId);

  const secret = randomBytes(32).toString("hex");

  const updated = await db
    .update(webhooks)
    .set({
      secret,
      updatedAt: new Date(),
    })
    .where(eq(webhooks.id, webhookId))
    .returning();

  return updated[0];
}

// Get webhook logs
export async function getWebhookLogs(webhookId: string, limit = 50) {
  return db.query.webhookLogs.findMany({
    where: eq(webhookLogs.webhookId, webhookId),
    orderBy: (l, { desc }) => [desc(l.createdAt)],
    limit,
  });
}

// Trigger webhooks for an event
export async function triggerWebhooks(
  workspaceId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  // Find active webhooks subscribed to this event
  const activeWebhooks = await db.query.webhooks.findMany({
    where: and(
      eq(webhooks.workspaceId, workspaceId),
      eq(webhooks.isActive, true)
    ),
  });

  // Filter webhooks that are subscribed to this event
  const subscribedWebhooks = activeWebhooks.filter(
    (w) => w.events && (w.events as WebhookEvent[]).includes(event)
  );

  if (subscribedWebhooks.length === 0) return;

  // Trigger each webhook
  const results = await Promise.allSettled(
    subscribedWebhooks.map((webhook) =>
      sendWebhook(webhook, event, payload)
    )
  );

  return results;
}

// Send webhook request
async function sendWebhook(
  webhook: typeof webhooks.$inferSelect,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    webhook_id: webhook.id,
    data: payload,
  });

  // Create signature
  const signature = createHmac("sha256", webhook.secret)
    .update(body)
    .digest("hex");

  const startTime = Date.now();
  let success = false;
  let responseStatus = "";
  let responseBody = "";

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": event,
        "X-Webhook-ID": webhook.id,
      },
      body,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    responseStatus = response.status.toString();
    responseBody = await response.text().catch(() => "");
    success = response.ok;

    // Update webhook last triggered
    await db
      .update(webhooks)
      .set({
        lastTriggeredAt: new Date(),
        failureCount: success ? "0" : String(parseInt(webhook.failureCount || "0") + 1),
      })
      .where(eq(webhooks.id, webhook.id));

    // Disable webhook after 10 consecutive failures
    if (!success && parseInt(webhook.failureCount || "0") >= 9) {
      await db
        .update(webhooks)
        .set({ isActive: false })
        .where(eq(webhooks.id, webhook.id));
    }
  } catch (error) {
    responseStatus = "error";
    responseBody = error instanceof Error ? error.message : "Unknown error";
    success = false;

    // Update failure count
    await db
      .update(webhooks)
      .set({
        failureCount: String(parseInt(webhook.failureCount || "0") + 1),
      })
      .where(eq(webhooks.id, webhook.id));
  }

  const duration = Date.now() - startTime;

  // Log the webhook attempt
  await db.insert(webhookLogs).values({
    id: ulid(),
    webhookId: webhook.id,
    event,
    payload,
    responseStatus,
    responseBody: responseBody.substring(0, 1000), // Limit response body
    success,
    duration: duration.toString(),
    createdAt: new Date(),
  });

  return { success, responseStatus, duration };
}

// Test webhook (send a test event)
export async function testWebhook(webhookId: string, workspaceId: string) {
  const webhook = await getWebhook(webhookId, workspaceId);

  return sendWebhook(webhook, "item.created", {
    test: true,
    message: "This is a test webhook from Dropboard",
    timestamp: new Date().toISOString(),
  });
}
