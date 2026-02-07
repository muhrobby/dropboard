# Phase 4: Team, RBAC & Activity

**Goal:** User bisa invite team members, manage roles, lihat activity log.

**Dependency:** Phase 2 complete. Can be done in parallel with Phase 3.

---

## Backend Checklist

### 4.1 Define DB schema: invites
- [x] Create `src/db/schema/invites.ts`
  - Fields per PLAN.md schema
  - Index: (token), (workspace_id, status)

### 4.2 Define DB schema: activity_logs
- [x] Create `src/db/schema/activity-logs.ts`
  - Fields per PLAN.md schema
  - Index: (workspace_id, created_at)

### 4.3 Run migration for invites + activity_logs
- [x] Run `pnpm drizzle-kit push`

### 4.4 RBAC middleware
- [x] Create `src/middleware/rbac.ts`
  - Permission types: manage_workspace, manage_members, invite_members, view_activity, crud_all_items, crud_own_items
  - Role → permission mapping
  - `requirePermission(member, permission)` → void or throw

### 4.5 Invite service
- [x] Create `src/services/invite-service.ts`
  - `createInvite(workspaceId, invitedBy, data)` → generate 64-char hex token
  - `listInvites(workspaceId)` → list pending
  - `cancelInvite(inviteId)` → update status
  - `acceptInvite(token, userId)` → validate, create membership
  - `getInviteByToken(token)` → for accept page
  - Token expires in 7 days

### 4.6 Member management
- [x] Functions in workspace-service or separate:
  - `listMembers(workspaceId)` → list with user info
  - `updateMemberRole(workspaceId, userId, newRole)` → RBAC check
  - `removeMember(workspaceId, userId)` → RBAC check
  - Cannot remove owner, cannot change owner role

### 4.7 Activity log service
- [x] Create `src/services/activity-service.ts`
  - `logActivity(data)` → insert log
  - `listActivity(workspaceId, pagination)` → newest first
  - Actions: ITEM_CREATED, ITEM_DELETED, ITEM_PINNED, ITEM_UNPINNED, INVITE_SENT, INVITE_ACCEPTED, INVITE_CANCELLED, MEMBER_ROLE_CHANGED, MEMBER_REMOVED

### 4.8 Integrate activity logging
- [x] Add `logActivity()` to item-service (create/delete/pin/unpin)
- [x] Add `logActivity()` to invite-service (create/accept/cancel)
- [x] Add `logActivity()` to member operations (role change/remove)
- [x] Non-blocking (fire-and-forget)

### 4.9 Invite Zod validations
- [x] Create `src/lib/validations/invite.ts`
  - `createInviteSchema`, `updateMemberRoleSchema`

### 4.10 Invite API routes
- [x] `app/api/v1/workspaces/[id]/invites/route.ts` → GET, POST
- [x] `app/api/v1/workspaces/[id]/invites/[inviteId]/route.ts` → DELETE
- [x] `app/api/v1/invites/[token]/accept/route.ts` → POST

### 4.11 Member API routes
- [x] `app/api/v1/workspaces/[id]/members/route.ts` → GET
- [x] `app/api/v1/workspaces/[id]/members/[userId]/route.ts` → PATCH, DELETE

### 4.12 Activity API route
- [x] `app/api/v1/activity/route.ts` → GET (owner/admin only)

---

## Frontend Checklist

### 4.13 Build Team page
- [ ] `app/(dashboard)/team/page.tsx`
  - Members list (avatar, name, email, role, actions)
  - Invites section (pending invites, create button)
  - Responsive: cards mobile, table desktop

### 4.14 Build Invite Dialog
- [ ] `src/components/team/invite-dialog.tsx`
  - Form: target identifier, role selector
  - Generate → show invite link + copy button

### 4.15 Build Role Badge
- [ ] `src/components/team/role-badge.tsx`
  - Owner (purple), Admin (blue), Member (gray)

### 4.16 Build Accept Invite page
- [ ] `app/invite/[token]/page.tsx`
  - Public page, show workspace + role info
  - Login/register links if not authenticated
  - Accept button if authenticated
  - Redirect to workspace after accept

### 4.17 Build Activity Log page
- [ ] `app/(dashboard)/activity/page.tsx`
  - Timeline of events
  - Each: icon, actor, description, timestamp
  - Pagination (load more)

### 4.18 Build Settings page
- [ ] `app/(dashboard)/settings/page.tsx`
  - Workspace name (editable for owner)
  - Storage usage bar
  - Members count
  - Danger zone: delete workspace

### 4.19 Tanstack Query hooks
- [ ] `src/hooks/use-members.ts`
  - useMembers, useUpdateMemberRole, useRemoveMember
  - useInvites, useCreateInvite, useCancelInvite, useAcceptInvite
  - useActivity (infinite query)
