import type { ItemType, MemberRole, ActivityAction } from ".";

// API Response types
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: PaginationMeta;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

// Workspace
export type WorkspaceResponse = {
  id: string;
  name: string;
  type: "personal" | "team";
  createdBy: string;
  storageUsedBytes: number;
  createdAt: string;
  updatedAt: string;
  role?: MemberRole;
};

export type CreateWorkspaceInput = {
  name: string;
  type: "team";
};

export type UpdateWorkspaceInput = {
  name: string;
};

// Member
export type MemberResponse = {
  id: string;
  userId: string;
  role: MemberRole;
  status: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
};

// Invite
export type InviteResponse = {
  id: string;
  workspaceId: string;
  token: string;
  targetIdentifier: string;
  role: MemberRole;
  status: string;
  expiresAt: string;
  createdAt: string;
};

// File Asset
export type FileAssetResponse = {
  id: string;
  workspaceId: string;
  uploadedBy: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
  downloadUrl: string;
};

// Item
export type ItemResponse = {
  id: string;
  workspaceId: string;
  createdBy: string;
  type: ItemType;
  title: string;
  content: string | null;
  note: string | null;
  tags: string[];
  isPinned: boolean;
  expiresAt: string | null;
  fileAssetId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  fileAsset: FileAssetResponse | null;
};

// Activity Log
export type ActivityLogResponse = {
  id: string;
  workspaceId: string;
  actorId: string;
  action: ActivityAction;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    name: string;
    email: string;
    image?: string | null;
  };
};
