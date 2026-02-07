export type ItemType = "drop" | "link" | "note";
export type WorkspaceType = "personal" | "team";
export type MemberRole = "owner" | "admin" | "member";
export type MemberStatus = "active" | "inactive";
export type InviteRole = "admin" | "member";
export type InviteStatus = "pending" | "accepted" | "cancelled";
export type ActivityAction =
  | "ITEM_CREATED"
  | "ITEM_DELETED"
  | "ITEM_PINNED"
  | "ITEM_UNPINNED"
  | "INVITE_SENT"
  | "INVITE_ACCEPTED"
  | "INVITE_CANCELLED"
  | "MEMBER_ROLE_CHANGED"
  | "MEMBER_REMOVED";
