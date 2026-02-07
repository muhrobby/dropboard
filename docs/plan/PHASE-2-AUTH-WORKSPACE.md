# Phase 2: Authentication & Workspace

**Goal:** User bisa register, login, dan memiliki personal workspace. Dashboard layout siap dan responsive.

**Dependency:** Phase 1 complete.

---

## Backend Checklist

### 2.1 Define DB schema: workspaces
- [x] Create `src/db/schema/workspaces.ts`
  - Fields: id, name, type, created_by, storage_used_bytes, created_at, updated_at
  - Type enum: 'personal', 'team'

### 2.2 Define DB schema: workspace_members
- [x] Create `src/db/schema/workspace-members.ts`
  - Fields: id, workspace_id, user_id, role, status, joined_at
  - Role enum: 'owner', 'admin', 'member'
  - Status enum: 'active', 'inactive'
  - Unique constraint: (workspace_id, user_id)

### 2.3 Create schema index
- [x] Create `src/db/schema/index.ts` — re-export all schemas

### 2.4 Configure Better Auth server
- [x] Create `src/lib/auth.ts`
  - Database adapter: Drizzle + PostgreSQL
  - basePath: `/api/v1/auth`
  - Hook: `after signup` → auto-create personal workspace + owner membership

### 2.5 Configure Better Auth client
- [x] Create `src/lib/auth-client.ts`
  - `createAuthClient({ baseURL: "/api/v1/auth" })`

### 2.6 Create auth API route
- [x] `app/api/v1/auth/[...all]/route.ts`
  - Export GET and POST → Better Auth handler

### 2.7 Create auth guard middleware
- [x] Create `src/middleware/auth-guard.ts`
  - `getSession(request)` → returns user + session or null
  - `requireAuth(request)` → returns user or throws UnauthorizedError

### 2.8 Create workspace guard
- [x] Create `src/middleware/workspace-guard.ts`
  - `requireWorkspaceMembership(userId, workspaceId)` → returns member record
  - Throws ForbiddenError if not member

### 2.9 Create Next.js edge middleware
- [x] Create `middleware.ts`
  - Redirect unauthenticated to `/login`
  - Redirect authenticated from `/login`, `/register` to `/drops`
  - Match: `/(dashboard)/*` paths

### 2.10 Workspace service
- [x] Create `src/services/workspace-service.ts`
  - `createWorkspace(data)` → insert workspace + owner membership
  - `listUserWorkspaces(userId)` → join workspace_members
  - `getWorkspace(id)` → single workspace
  - `updateWorkspace(id, data)` → update name
  - `deleteWorkspace(id)` → only owner, only team type
  - `createPersonalWorkspace(userId, userName)` → called after signup

### 2.11 Workspace Zod validations
- [x] Create `src/lib/validations/workspace.ts`
  - `createWorkspaceSchema`
  - `updateWorkspaceSchema`

### 2.12 Workspace API routes
- [x] `app/api/v1/workspaces/route.ts` → GET (list), POST (create)
- [x] `app/api/v1/workspaces/[id]/route.ts` → GET, PATCH, DELETE

### 2.13 Run migrations
- [x] `pnpm drizzle-kit generate`
- [x] `pnpm drizzle-kit migrate`

---

## Frontend Checklist

### 2.14 Build Auth layout
- [x] `app/(auth)/layout.tsx`
  - Centered card layout, no sidebar
  - Responsive: full-screen mobile, centered card desktop
  - Logo/brand at top

### 2.15 Build Login page
- [x] `app/(auth)/login/page.tsx`
  - Form: email + password
  - Link to register
  - Better Auth `signIn.email()` client call
  - Validation display
  - Loading state
  - Responsive

### 2.16 Build Register page
- [x] `app/(auth)/register/page.tsx`
  - Form: name + email + password + confirm password
  - Link to login
  - Better Auth `signUp.email()` client call
  - Auto-redirect to `/drops` after success
  - Responsive

### 2.17 Build Dashboard layout
- [x] `app/(dashboard)/layout.tsx`
  - Desktop: sidebar (left) + main content
  - Mobile: topbar + content + bottom nav
  - Fetch user session
  - Fetch workspaces
  - Set active workspace in zustand

### 2.18 Build Sidebar
- [x] `src/components/layout/sidebar.tsx`
  - Navigation links: Drops, Pinboard, Search, Team, Activity, Settings
  - Active state highlight
  - Icons for each menu item
  - Workspace switcher at top
  - User info at bottom
  - Collapsible on desktop (optional MVP)

### 2.19 Build Topbar
- [x] `src/components/layout/topbar.tsx`
  - Left: hamburger (mobile) / page title
  - Right: search button, user avatar dropdown
  - User dropdown: logout

### 2.20 Build Workspace Switcher
- [x] `src/components/layout/workspace-switcher.tsx`
  - Dropdown showing current workspace
  - List all user workspaces
  - "Create workspace" option
  - Switch → update zustand store

### 2.21 Build Mobile Navigation
- [x] `src/components/layout/mobile-nav.tsx`
  - Bottom tab bar
  - Icons: Drops, Pinboard, Search, Team, More
  - Active tab highlight
  - Only visible on mobile viewports

### 2.22 Zustand workspace store
- [x] `src/stores/workspace-store.ts`
  - State: `activeWorkspaceId`, `workspaces[]`
  - Actions: `setActiveWorkspace`, `setWorkspaces`
  - Persist active workspace ID in localStorage

### 2.23 Tanstack Query hooks: workspace
- [x] `src/hooks/use-workspace.ts`
  - `useWorkspaces()` → list workspaces
  - `useCreateWorkspace()` → mutation
  - Sync with zustand on success

### 2.24 Build initial Drops page
- [x] `app/(dashboard)/drops/page.tsx`
  - Empty state with upload prompt
  - Page title "Drops"
  - This is the default landing after login
