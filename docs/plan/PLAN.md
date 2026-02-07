# Implementation Plan — Team Dropboard

## Tech Stack & Architecture Decisions

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Better Auth |
| UI | Shadcn/ui + Tailwind CSS v4 |
| State Management | Tanstack Query (server) + Zustand (client) |
| File Storage | Local disk + signed URL |
| PWA | next-pwa |
| Invite System | Copy invite link (no email di MVP) |
| Cleanup Job | Next.js Cron Route Handler |
| API | RESTful with versioning (`/api/v1/...`) |
| Deployment | VPS / Self-hosted (Docker) |
| Package Manager | pnpm |

---

## Project Structure (Target)

```
dropboard/
├── app/
│   ├── (auth)/                    # Auth pages group
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx             # Auth layout (no sidebar)
│   ├── (dashboard)/               # Protected pages group
│   │   ├── layout.tsx             # Dashboard layout (sidebar + topbar)
│   │   ├── drops/page.tsx         # Drop items page
│   │   ├── pinboard/page.tsx      # Links & Notes page
│   │   ├── search/page.tsx        # Global search page
│   │   ├── team/page.tsx          # Team members & invites
│   │   ├── activity/page.tsx      # Activity log
│   │   └── settings/page.tsx      # Workspace settings
│   ├── api/
│   │   └── v1/
│   │       ├── auth/[...all]/route.ts    # Better Auth handler
│   │       ├── workspaces/route.ts
│   │       ├── workspaces/[id]/route.ts
│   │       ├── workspaces/[id]/members/route.ts
│   │       ├── workspaces/[id]/invites/route.ts
│   │       ├── items/route.ts
│   │       ├── items/[id]/route.ts
│   │       ├── items/[id]/pin/route.ts
│   │       ├── files/upload/route.ts
│   │       ├── files/[id]/route.ts       # Signed download
│   │       ├── search/route.ts
│   │       ├── activity/route.ts
│   │       └── cron/cleanup/route.ts
│   ├── invite/[token]/page.tsx    # Public invite accept page
│   ├── globals.css
│   ├── layout.tsx
│   ├── manifest.ts                # PWA manifest
│   └── page.tsx                   # Landing / redirect
├── src/
│   ├── components/
│   │   ├── ui/                    # Shadcn components
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   ├── workspace-switcher.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── drops/
│   │   │   ├── drop-list.tsx
│   │   │   ├── drop-card.tsx
│   │   │   ├── upload-modal.tsx
│   │   │   ├── upload-dropzone.tsx
│   │   │   └── retention-badge.tsx
│   │   ├── pinboard/
│   │   │   ├── link-card.tsx
│   │   │   ├── note-card.tsx
│   │   │   ├── add-link-form.tsx
│   │   │   └── add-note-form.tsx
│   │   ├── search/
│   │   │   ├── search-bar.tsx
│   │   │   └── search-results.tsx
│   │   ├── team/
│   │   │   ├── member-list.tsx
│   │   │   ├── invite-dialog.tsx
│   │   │   └── role-badge.tsx
│   │   └── shared/
│   │       ├── pin-button.tsx
│   │       ├── tag-input.tsx
│   │       ├── empty-state.tsx
│   │       ├── loading-skeleton.tsx
│   │       └── confirm-dialog.tsx
│   ├── db/
│   │   ├── index.ts               # Drizzle client instance
│   │   └── schema/
│   │       ├── index.ts           # Re-export all schemas
│   │       ├── users.ts
│   │       ├── workspaces.ts
│   │       ├── workspace-members.ts
│   │       ├── invites.ts
│   │       ├── items.ts
│   │       ├── file-assets.ts
│   │       └── activity-logs.ts
│   ├── lib/
│   │   ├── auth.ts                # Better Auth server config
│   │   ├── auth-client.ts         # Better Auth client
│   │   ├── utils.ts               # Shadcn utility (cn)
│   │   ├── api-helpers.ts         # API response helpers
│   │   ├── errors.ts              # Custom error classes
│   │   ├── constants.ts           # App constants
│   │   ├── validations/
│   │   │   ├── workspace.ts       # Zod schemas
│   │   │   ├── item.ts
│   │   │   ├── invite.ts
│   │   │   └── search.ts
│   │   └── file-storage.ts        # Local file storage utilities
│   ├── hooks/
│   │   ├── use-workspace.ts
│   │   ├── use-items.ts
│   │   ├── use-upload.ts
│   │   ├── use-search.ts
│   │   └── use-members.ts
│   ├── stores/
│   │   ├── workspace-store.ts     # Zustand: active workspace
│   │   └── ui-store.ts            # Zustand: sidebar, modals
│   ├── services/
│   │   ├── workspace-service.ts
│   │   ├── item-service.ts
│   │   ├── invite-service.ts
│   │   ├── file-service.ts
│   │   ├── search-service.ts
│   │   ├── activity-service.ts
│   │   └── cleanup-service.ts
│   ├── middleware/
│   │   ├── auth-guard.ts
│   │   ├── workspace-guard.ts
│   │   └── rbac.ts
│   └── types/
│       ├── index.ts
│       ├── api.ts
│       └── workspace.ts
├── uploads/                       # Local file storage
├── drizzle.config.ts
├── middleware.ts                   # Next.js edge middleware
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## API Versioning Strategy

Semua endpoint di bawah `/api/v1/`. Jika ada breaking changes di masa depan, buat `/api/v2/` tanpa mengganggu v1.

```
POST   /api/v1/auth/[...all]              # Better Auth catch-all
GET    /api/v1/workspaces                  # List user workspaces
POST   /api/v1/workspaces                  # Create workspace
GET    /api/v1/workspaces/:id              # Get workspace detail
PATCH  /api/v1/workspaces/:id              # Update workspace
DELETE /api/v1/workspaces/:id              # Delete workspace (owner only)
GET    /api/v1/workspaces/:id/members      # List members
PATCH  /api/v1/workspaces/:id/members/:uid # Update member role
DELETE /api/v1/workspaces/:id/members/:uid # Remove member
GET    /api/v1/workspaces/:id/invites      # List invites
POST   /api/v1/workspaces/:id/invites      # Create invite
DELETE /api/v1/workspaces/:id/invites/:iid # Cancel invite
POST   /api/v1/invites/:token/accept       # Accept invite
GET    /api/v1/items                       # List items (workspace query param)
POST   /api/v1/items                       # Create item
GET    /api/v1/items/:id                   # Get item detail
PATCH  /api/v1/items/:id                   # Update item
DELETE /api/v1/items/:id                   # Delete item
POST   /api/v1/items/:id/pin              # Pin item
DELETE /api/v1/items/:id/pin              # Unpin item
POST   /api/v1/files/upload               # Upload file (multipart)
GET    /api/v1/files/:id                   # Download file (signed)
GET    /api/v1/search                      # Search items
GET    /api/v1/activity                    # Activity log
POST   /api/v1/cron/cleanup               # Trigger cleanup (secured)
```

---

## Database Schema Overview

```
users ─────────┐
               ├──► workspace_members ◄── workspaces
               │                              │
               ├──► items ◄───────────────────┘
               │      │
               │      └──► file_assets
               │
               ├──► invites ◄─────────────── workspaces
               │
               └──► activity_logs ◄───────── workspaces
```

### Schema Detail

**users** (managed by Better Auth)
| Column | Type | Notes |
|--------|------|-------|
| id | text | PK |
| name | text | |
| email | text | unique |
| emailVerified | boolean | |
| image | text | nullable |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**workspaces**
| Column | Type | Notes |
|--------|------|-------|
| id | text (ULID) | PK |
| name | varchar(100) | |
| type | enum('personal','team') | |
| created_by | text | FK → users.id |
| storage_used_bytes | bigint | default 0 |
| created_at | timestamp | |
| updated_at | timestamp | |

**workspace_members**
| Column | Type | Notes |
|--------|------|-------|
| id | text (ULID) | PK |
| workspace_id | text | FK → workspaces.id |
| user_id | text | FK → users.id |
| role | enum('owner','admin','member') | |
| status | enum('active','inactive') | |
| joined_at | timestamp | |

**invites**
| Column | Type | Notes |
|--------|------|-------|
| id | text (ULID) | PK |
| workspace_id | text | FK → workspaces.id |
| invited_by | text | FK → users.id |
| token | varchar(64) | unique, crypto random |
| target_identifier | text | email/phone (display only) |
| role | enum('admin','member') | |
| status | enum('pending','accepted','cancelled') | |
| expires_at | timestamp | |
| created_at | timestamp | |

**items**
| Column | Type | Notes |
|--------|------|-------|
| id | text (ULID) | PK |
| workspace_id | text | FK → workspaces.id |
| created_by | text | FK → users.id |
| type | enum('drop','link','note') | |
| title | varchar(255) | |
| content | text | nullable |
| note | text | nullable |
| tags | text[] | string array |
| is_pinned | boolean | default false |
| expires_at | timestamp | nullable |
| file_asset_id | text | nullable, FK → file_assets.id |
| created_at | timestamp | |
| updated_at | timestamp | |

**file_assets**
| Column | Type | Notes |
|--------|------|-------|
| id | text (ULID) | PK |
| workspace_id | text | FK → workspaces.id |
| uploaded_by | text | FK → users.id |
| original_name | varchar(255) | |
| stored_name | varchar(255) | |
| mime_type | varchar(100) | |
| size_bytes | bigint | |
| storage_path | text | |
| created_at | timestamp | |

**activity_logs**
| Column | Type | Notes |
|--------|------|-------|
| id | text (ULID) | PK |
| workspace_id | text | FK → workspaces.id |
| actor_id | text | FK → users.id |
| action | varchar(50) | |
| target_type | varchar(50) | nullable |
| target_id | text | nullable |
| metadata | jsonb | nullable |
| created_at | timestamp | |

---

## Implementation Phases

| Phase | Nama | Detail |
|-------|------|--------|
| 1 | Foundation & Infrastructure | [PHASE-1-FOUNDATION.md](./PHASE-1-FOUNDATION.md) |
| 2 | Authentication & Workspace | [PHASE-2-AUTH-WORKSPACE.md](./PHASE-2-AUTH-WORKSPACE.md) |
| 3 | Items Core (Drop, Link, Note) | [PHASE-3-ITEMS.md](./PHASE-3-ITEMS.md) |
| 4 | Team, RBAC & Activity | [PHASE-4-TEAM-RBAC.md](./PHASE-4-TEAM-RBAC.md) |
| 5 | Search, Cleanup & Quota | [PHASE-5-SEARCH-CLEANUP.md](./PHASE-5-SEARCH-CLEANUP.md) |
| 6 | PWA, Polish & Deployment | [PHASE-6-PWA-DEPLOY.md](./PHASE-6-PWA-DEPLOY.md) |

### Dependency Graph

```
Phase 1 (Foundation)
    └──► Phase 2 (Auth + Workspace)
              ├──► Phase 3 (Items)  ──────────┐
              └──► Phase 4 (Team + RBAC) ─────┤
                                               └──► Phase 5 (Search + Cleanup)
                                                         └──► Phase 6 (PWA + Deploy)
```

Phase 3 dan Phase 4 bisa dikerjakan paralel setelah Phase 2 selesai.

---

## Key Technical Decisions

### ULID over UUID
Sortable by creation time, URL-safe, better for database indexing.

### Retention Logic
```typescript
// DROP temporary: expires_at = now + 7 days, is_pinned = false
// DROP permanent: expires_at = null, is_pinned = true
// LINK/NOTE: expires_at = null, is_pinned = true (always permanent)
// PIN: expires_at = null, is_pinned = true
// UNPIN: expires_at = now + 7 days, is_pinned = false
```

### API Response Format
```typescript
{ success: true, data: { ... } }
{ success: true, data: [...], meta: { page, limit, total } }
{ success: false, error: { code: "NOT_FOUND", message: "..." } }
```

### Workspace Isolation
Every data API endpoint MUST: verify auth → verify membership → filter by workspace_id.

### Signed URL for Files
```
/api/v1/files/{id}?token={hmac}&expires={timestamp}
HMAC = HMAC-SHA256(secret, fileAssetId:expires)
```
