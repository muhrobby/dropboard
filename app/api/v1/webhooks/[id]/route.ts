import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth-guard";
import { requireWorkspaceMembership } from "@/middleware/workspace-guard";
import {
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookLogs,
  regenerateSecret,
} from "@/services/webhook-service";
import {
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
  forbiddenResponse,
  errorResponse,
} from "@/lib/api-helpers";
import { AppError } from "@/lib/errors";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@/db/schema/webhooks";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      return validationErrorResponse("workspaceId is required");
    }

    const membership = await requireWorkspaceMembership(session.user.id, workspaceId);
    
    if (!["owner", "admin"].includes(membership.role)) {
      return forbiddenResponse("Access denied");
    }

    const webhook = await getWebhook(id, workspaceId);
    const logs = await getWebhookLogs(id, 20);

    return successResponse({
      ...webhook,
      secret: `${webhook.secret.substring(0, 8)}...`,
      recentLogs: logs,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse("APP_ERROR", error.message, error.statusCode);
    }
    return serverErrorResponse();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      return validationErrorResponse("workspaceId is required");
    }

    const membership = await requireWorkspaceMembership(session.user.id, workspaceId);
    
    if (!["owner", "admin"].includes(membership.role)) {
      return forbiddenResponse("Access denied");
    }

    const body = await req.json();

    // Validate events if provided
    let validEvents: WebhookEvent[] | undefined;
    if (body.events) {
      validEvents = body.events.filter((e: string) =>
        WEBHOOK_EVENTS.includes(e as WebhookEvent)
      );
    }

    const webhook = await updateWebhook(id, workspaceId, {
      name: body.name,
      url: body.url,
      events: validEvents,
      isActive: body.isActive,
    });

    return successResponse({
      ...webhook,
      secret: `${webhook.secret.substring(0, 8)}...`,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse("APP_ERROR", error.message, error.statusCode);
    }
    return serverErrorResponse();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      return validationErrorResponse("workspaceId is required");
    }

    const membership = await requireWorkspaceMembership(session.user.id, workspaceId);
    
    if (!["owner", "admin"].includes(membership.role)) {
      return forbiddenResponse("Access denied");
    }

    await deleteWebhook(id, workspaceId);

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse("APP_ERROR", error.message, error.statusCode);
    }
    return serverErrorResponse();
  }
}
