import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import { createWebhook, getWebhooks } from "@/services/webhook-service";
import {
  createdResponse,
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
  forbiddenResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";
import { WEBHOOK_EVENTS, type WebhookEvent, type Webhook } from "@/db/schema/webhooks";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      return validationErrorResponse("workspaceId is required");
    }

    const membership = await requireWorkspaceMembership(session.user.id, workspaceId);
    
    // Only owners and admins can view webhooks
    if (!["owner", "admin"].includes(membership.role)) {
      return forbiddenResponse("Access denied");
    }

    const hooks = await getWebhooks(workspaceId);

    // Hide secrets in response
    const safeHooks = hooks.map((h: Webhook) => ({
      ...h,
      secret: `${h.secret.substring(0, 8)}...`,
    }));

    return successResponse(safeHooks);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse("APP_ERROR", error.message, error.statusCode);
    }
    return serverErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      return validationErrorResponse("workspaceId is required");
    }

    const membership = await requireWorkspaceMembership(session.user.id, workspaceId);
    
    // Only owners and admins can create webhooks
    if (!["owner", "admin"].includes(membership.role)) {
      return forbiddenResponse("Access denied");
    }

    const body = await req.json();

    // Validate required fields
    if (!body.name || !body.url || !body.events) {
      return validationErrorResponse("name, url, and events are required");
    }

    // Validate events
    const validEvents = body.events.filter((e: string) =>
      WEBHOOK_EVENTS.includes(e as WebhookEvent)
    );

    if (validEvents.length === 0) {
      return validationErrorResponse("At least one valid event is required");
    }

    const webhook = await createWebhook(workspaceId, session.user.id, {
      name: body.name,
      url: body.url,
      events: validEvents,
    });

    return createdResponse(webhook);
  } catch (error) {
    console.error("Create webhook error:", error);
    if (error instanceof AppError) {
      return errorResponse("APP_ERROR", error.message, error.statusCode);
    }
    return serverErrorResponse("Failed to create webhook");
  }
}
