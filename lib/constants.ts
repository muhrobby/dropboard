// Retention
export const DEFAULT_RETENTION_DAYS = 7;

// File Upload
export const MAX_UPLOAD_SIZE_MB = parseInt(
  process.env.MAX_UPLOAD_SIZE_MB || "20",
  10
);
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

// Storage Quota (Free plan)
export const FREE_STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
export const FREE_PINNED_LIMIT = 50;

// Pagination
export const ITEMS_PER_PAGE = 20;

// Allowed file types
export const ALLOWED_FILE_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text
  "text/plain",
  "text/csv",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
];

// Invite
export const INVITE_EXPIRY_DAYS = 7;

// RBAC Permissions
export const PERMISSIONS = {
  MANAGE_WORKSPACE: "manage_workspace",
  MANAGE_MEMBERS: "manage_members",
  INVITE_MEMBERS: "invite_members",
  VIEW_ACTIVITY: "view_activity",
  CRUD_ALL_ITEMS: "crud_all_items",
  CRUD_OWN_ITEMS: "crud_own_items",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: [
    PERMISSIONS.MANAGE_WORKSPACE,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.VIEW_ACTIVITY,
    PERMISSIONS.CRUD_ALL_ITEMS,
  ],
  admin: [
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.VIEW_ACTIVITY,
    PERMISSIONS.CRUD_ALL_ITEMS,
  ],
  member: [PERMISSIONS.CRUD_OWN_ITEMS],
};

// Activity Log Actions
export const ACTIVITY_ACTIONS = {
  ITEM_CREATED: "ITEM_CREATED",
  ITEM_DELETED: "ITEM_DELETED",
  ITEM_PINNED: "ITEM_PINNED",
  ITEM_UNPINNED: "ITEM_UNPINNED",
  INVITE_SENT: "INVITE_SENT",
  INVITE_ACCEPTED: "INVITE_ACCEPTED",
  INVITE_CANCELLED: "INVITE_CANCELLED",
  MEMBER_ROLE_CHANGED: "MEMBER_ROLE_CHANGED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
} as const;
