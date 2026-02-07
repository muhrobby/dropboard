/**
 * Audit Service
 *
 * Modul ini menyediakan fungsi untuk mencatat audit log
 * untuk sensitive operations seperti login, file access,
 * settings change, dan lain-lain.
 *
 * Audit log penting untuk:
 * - Forensic investigation
 * - Security monitoring
 * - Compliance requirements
 * - anomaly detection
 */

import { db } from "@/db";
import { activityLogs } from "@/db/schema/activity-logs";
import { ulid } from "ulid";

/**
 * Audit action types
 *
 * Menentukan jenis-jenis action yang akan di-log
 */
export const AUDIT_ACTIONS = {
  // Authentication actions
  AUTH_LOGIN: "AUTH_LOGIN",
  AUTH_LOGOUT: "AUTH_LOGOUT",
  AUTH_LOGIN_FAILED: "AUTH_LOGIN_FAILED",
  AUTH_PASSWORD_CHANGE: "AUTH_PASSWORD_CHANGE",
  AUTH_PASSWORD_RESET_REQUEST: "AUTH_PASSWORD_RESET_REQUEST",
  AUTH_EMAIL_VERIFIED: "AUTH_EMAIL_VERIFIED",

  // Workspace actions
  WORKSPACE_CREATE: "WORKSPACE_CREATE",
  WORKSPACE_UPDATE: "WORKSPACE_UPDATE",
  WORKSPACE_DELETE: "WORKSPACE_DELETE",

  // Member actions
  MEMBER_INVITE: "MEMBER_INVITE",
  MEMBER_INVITE_ACCEPT: "MEMBER_INVITE_ACCEPT",
  MEMBER_INVITE_CANCEL: "MEMBER_INVITE_CANCEL",
  MEMBER_ROLE_CHANGE: "MEMBER_ROLE_CHANGE",
  MEMBER_REMOVE: "MEMBER_REMOVE",

  // Item actions
  ITEM_CREATE: "ITEM_CREATE",
  ITEM_UPDATE: "ITEM_UPDATE",
  ITEM_DELETE: "ITEM_DELETE",
  ITEM_PIN: "ITEM_PIN",
  ITEM_UNPIN: "ITEM_UNPIN",

  // File actions
  FILE_UPLOAD: "FILE_UPLOAD",
  FILE_DOWNLOAD: "FILE_DOWNLOAD",
  FILE_DELETE: "FILE_DELETE",

  // Settings actions
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
  SETTINGS_API_KEY_CREATE: "SETTINGS_API_KEY_CREATE",
  SETTINGS_API_KEY_DELETE: "SETTINGS_API_KEY_DELETE",

  // Security actions
  SECURITY_SUSPICIOUS_ACTIVITY: "SECURITY_SUSPICIOUS_ACTIVITY",
  SECURITY_RATE_LIMIT_EXCEEDED: "SECURITY_RATE_LIMIT_EXCEEDED",
  SECURITY_UNAUTHORIZED_ACCESS: "SECURITY_UNAUTHORIZED_ACCESS",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Target resource types
 */
export const TARGET_TYPES = {
  WORKSPACE: "workspace",
  MEMBER: "member",
  ITEM: "item",
  FILE: "file",
  INVITE: "invite",
  USER: "user",
  API_KEY: "api_key",
  SETTINGS: "settings",
} as const;

export type TargetType = (typeof TARGET_TYPES)[keyof typeof TARGET_TYPES];

/**
 * Audit log entry parameters
 */
export interface AuditLogParams {
  /** Workspace ID */
  workspaceId: string;
  /** User/Actor ID who performed the action */
  actorId: string;
  /** Action type */
  action: AuditAction;
  /** Target resource type */
  targetType?: TargetType;
  /** Target resource ID */
  targetId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** IP address of the request */
  ipAddress?: string;
  /** User agent of the request */
  userAgent?: string;
  /** Whether the action was successful */
  success?: boolean;
}

/**
 * Extract client information from Request object
 *
 * @param request - Next.js Request object
 * @returns Client info (IP and user agent)
 */
export function extractClientInfo(request: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const headers = request.headers;

  // Extract IP address from various headers
  const ipHeaders = [
    "cf-connecting-ip", // Cloudflare
    "x-forwarded-for", // Standard proxy header
    "x-real-ip", // Nginx
    "x-client-ip", // Some proxies
    "fly-client-ip", // Fly.io
  ];

  let ipAddress = "unknown";
  for (const header of ipHeaders) {
    const value = headers.get(header);
    if (value) {
      ipAddress = value.split(",")[0].trim();
      break;
    }
  }

  // Extract user agent
  const userAgent = headers.get("user-agent") || "unknown";

  return { ipAddress, userAgent };
}

/**
 * Create an audit log entry
 *
 * @param params - Audit log parameters
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      id: ulid(),
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: {
        ...params.metadata,
        // Always include IP and user agent if available
        ...(params.ipAddress && { ipAddress: params.ipAddress }),
        ...(params.userAgent && { userAgent: params.userAgent }),
        // Track success/failure
        ...(params.success !== undefined && { success: params.success }),
      },
      createdAt: new Date(),
    });
  } catch (error) {
    // Don't throw - audit logging failure shouldn't break the app
    console.error("[Audit] Failed to create audit log:", error);
  }
}

/**
 * Create audit log from Request context
 *
 * Convenience function that extracts client info from Request
 *
 * @param params - Audit log parameters (without ipAddress/userAgent)
 * @param request - Next.js Request object
 */
export async function createAuditLogFromRequest(
  params: Omit<AuditLogParams, "ipAddress" | "userAgent">,
  request: Request
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(request);

  await createAuditLog({
    ...params,
    ipAddress,
    userAgent,
  });
}

/**
 * Audit helper functions for common operations
 */

export const audit = {
  /**
   * Log authentication event
   */
  auth: async (params: {
    workspaceId: string;
    userId: string;
    action: "login" | "logout" | "login_failed" | "password_change" | "email_verified";
    request?: Request;
    metadata?: Record<string, unknown>;
  }) => {
    const actionMap = {
      login: AUDIT_ACTIONS.AUTH_LOGIN,
      logout: AUDIT_ACTIONS.AUTH_LOGOUT,
      login_failed: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
      password_change: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
      email_verified: AUDIT_ACTIONS.AUTH_EMAIL_VERIFIED,
    };

    const clientInfo = params.request
      ? extractClientInfo(params.request)
      : { ipAddress: undefined, userAgent: undefined };

    await createAuditLog({
      workspaceId: params.workspaceId,
      actorId: params.userId,
      action: actionMap[params.action],
      targetType: TARGET_TYPES.USER,
      targetId: params.userId,
      metadata: params.metadata,
      ...clientInfo,
    });
  },

  /**
   * Log file operation
   */
  file: async (params: {
    workspaceId: string;
    userId: string;
    action: "upload" | "download" | "delete";
    fileAssetId: string;
    fileName: string;
    fileSize?: number;
    request?: Request;
  }) => {
    const actionMap = {
      upload: AUDIT_ACTIONS.FILE_UPLOAD,
      download: AUDIT_ACTIONS.FILE_DOWNLOAD,
      delete: AUDIT_ACTIONS.FILE_DELETE,
    };

    const clientInfo = params.request
      ? extractClientInfo(params.request)
      : { ipAddress: undefined, userAgent: undefined };

    await createAuditLog({
      workspaceId: params.workspaceId,
      actorId: params.userId,
      action: actionMap[params.action],
      targetType: TARGET_TYPES.FILE,
      targetId: params.fileAssetId,
      metadata: {
        fileName: params.fileName,
        fileSize: params.fileSize,
      },
      ...clientInfo,
    });
  },

  /**
   * Log security event
   */
  security: async (params: {
    workspaceId: string;
    userId?: string;
    action: "suspicious_activity" | "rate_limit_exceeded" | "unauthorized_access";
    request: Request;
    metadata?: Record<string, unknown>;
  }) => {
    const actionMap = {
      suspicious_activity: AUDIT_ACTIONS.SECURITY_SUSPICIOUS_ACTIVITY,
      rate_limit_exceeded: AUDIT_ACTIONS.SECURITY_RATE_LIMIT_EXCEEDED,
      unauthorized_access: AUDIT_ACTIONS.SECURITY_UNAUTHORIZED_ACCESS,
    };

    const { ipAddress, userAgent } = extractClientInfo(params.request);

    await createAuditLog({
      workspaceId: params.workspaceId,
      actorId: params.userId || "system",
      action: actionMap[params.action],
      metadata: {
        ...params.metadata,
        ipAddress,
        userAgent,
      },
      ipAddress,
      userAgent,
      success: false, // Security events are typically failures
    });
  },

  /**
   * Log member operation
   */
  member: async (params: {
    workspaceId: string;
    actorId: string;
    action: "invite" | "invite_accept" | "invite_cancel" | "role_change" | "remove";
    targetMemberId?: string;
    request?: Request;
    metadata?: Record<string, unknown>;
  }) => {
    const actionMap = {
      invite: AUDIT_ACTIONS.MEMBER_INVITE,
      invite_accept: AUDIT_ACTIONS.MEMBER_INVITE_ACCEPT,
      invite_cancel: AUDIT_ACTIONS.MEMBER_INVITE_CANCEL,
      role_change: AUDIT_ACTIONS.MEMBER_ROLE_CHANGE,
      remove: AUDIT_ACTIONS.MEMBER_REMOVE,
    };

    const clientInfo = params.request
      ? extractClientInfo(params.request)
      : { ipAddress: undefined, userAgent: undefined };

    await createAuditLog({
      workspaceId: params.workspaceId,
      actorId: params.actorId,
      action: actionMap[params.action],
      targetType: TARGET_TYPES.MEMBER,
      targetId: params.targetMemberId,
      metadata: params.metadata,
      ...clientInfo,
    });
  },

  /**
   * Log settings change
   */
  settings: async (params: {
    workspaceId: string;
    userId: string;
    action: "update" | "api_key_create" | "api_key_delete";
    request?: Request;
    metadata?: Record<string, unknown>;
  }) => {
    const actionMap = {
      update: AUDIT_ACTIONS.SETTINGS_UPDATE,
      api_key_create: AUDIT_ACTIONS.SETTINGS_API_KEY_CREATE,
      api_key_delete: AUDIT_ACTIONS.SETTINGS_API_KEY_DELETE,
    };

    const clientInfo = params.request
      ? extractClientInfo(params.request)
      : { ipAddress: undefined, userAgent: undefined };

    await createAuditLog({
      workspaceId: params.workspaceId,
      actorId: params.userId,
      action: actionMap[params.action],
      targetType: TARGET_TYPES.SETTINGS,
      metadata: params.metadata,
      ...clientInfo,
    });
  },
};

/**
 * Get recent audit logs for a workspace
 *
 * @param workspaceId - Workspace ID
 * @param limit - Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function getRecentAuditLogs(workspaceId: string, limit: number = 100) {
  // Note: This assumes you have a query method set up
  // You may need to adjust based on your db setup
  const logs = await db.query.activityLogs.findMany({
    where: (activityLogs, { eq }) => eq(activityLogs.workspaceId, workspaceId),
    orderBy: (activityLogs, { desc }) => desc(activityLogs.createdAt),
    limit,
  });

  return logs;
}
