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
  // Virus scan fields
  scanStatus: string | null;
  scanResult: string | null;
  scannedAt: string | null;
  // Media metadata
  metadata: {
    width?: number;
    height?: number;
    duration?: number | null;
    pageCount?: number | null;
    exif?: Record<string, unknown>;
  } | null;
};

// Collection
export type CollectionResponse = {
  id: string;
  workspaceId: string;
  createdBy: string;
  name: string;
  parentId: string | null;
  isPublic: boolean;
  shareToken: string | null;
  boardUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

// Public Board (unauthenticated view of a published collection)
export type PublicBoardResponse = {
  collection: {
    id: string;
    name: string;
    shareToken: string;
  };
  items: PublicBoardItem[];
};

export type PublicBoardItem = {
  id: string;
  type: "link" | "note";
  title: string;
  content: string | null;
  note: string | null;
  tags: string[];
  createdAt: string;
  linkMetadata: LinkMetadata | null;
};

// Item
export type LinkMetadata = {
  ogImage?: string | null;
  ogDescription?: string | null;
  faviconUrl?: string | null;
};

export type ItemResponse = {
  id: string;
  workspaceId: string;
  createdBy: string;
  type: ItemType;
  title: string;
  content: string | null;
  note: string | null;
  tags: string[];
  isProtected?: boolean;
  isPinned: boolean;
  expiresAt: string | null;
  fileAssetId: string | null;
  collectionId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  fileAsset: FileAssetResponse | null;
  // OCR fields
  ocrText: string | null;
  ocrStatus: string | null;
  // PWA offline access
  availableOffline: boolean;
  // Rich metadata for link items (OG image, description, favicon)
  linkMetadata: LinkMetadata | null;
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

// Item Version
export type ItemVersionResponse = {
  id: string;
  itemId: string;
  workspaceId: string;
  fileAssetId: string;
  createdBy: string;
  versionNumber: number;
  label: string | null;
  createdAt: string;
  fileAsset: FileAssetResponse | null;
};

// Item Comment
export type ItemCommentResponse = {
  id: string;
  itemId: string;
  workspaceId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    name: string;
    email: string;
    image?: string | null;
  };
};

// Share
export type ShareResponse = {
  id: string;
  itemId: string;
  token: string;
  createdBy: string;
  expiresAt: string | null;
  accessCount: number;
  passwordHash: string | null;
  maxViews: number | null;
  burnAfterReading: boolean;
  createdAt: string;
  shareUrl: string;
  isPasswordProtected: boolean;
};

// Share Analytics
export type ShareAnalyticsEntryResponse = {
  id: string;
  shareId: string;
  ipHash: string | null;
  userAgent: string | null;
  referer: string | null;
  accessedAt: string;
};

export type ShareAnalyticsResponse = {
  totalViews: number;
  last30Days: number;
  recentEntries: ShareAnalyticsEntryResponse[];
  dailyCounts: { date: string; count: number }[];
};
