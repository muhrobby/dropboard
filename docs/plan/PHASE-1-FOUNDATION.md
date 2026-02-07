# Phase 1: Foundation & Infrastructure

**Goal:** Setup semua tooling, database, dan project structure agar siap untuk development.

**Dependency:** None (starting point).

---

## Checklist

### 1.1 Initialize shadcn/ui
- [x] Run `pnpm dlx shadcn@latest init`
- [x] Pilih style, color, CSS variables
- [x] Verify `components.json` created
- [x] Verify `src/lib/utils.ts` created

### 1.2 Install shadcn base components
- [x] button, input, label, card
- [x] dialog, dropdown-menu, sheet
- [x] toast (sonner), skeleton, badge
- [x] tabs, separator, avatar
- [x] select, textarea, tooltip, popover
- [x] command (for search)

### 1.3 Install core dependencies
```bash
pnpm add drizzle-orm postgres better-auth @tanstack/react-query zustand zod ulid sonner
pnpm add -D drizzle-kit @types/pg
```

### 1.4 Setup PostgreSQL via Docker
- [x] Create `docker-compose.yml`
  - Service: postgres (port 5432)
  - Volume: persistent data
  - Default dev credentials: dropboard/dropboard
- [x] Verify DB connection

### 1.5 Create `.env.example`
```env
DATABASE_URL=postgres://dropboard:dropboard@localhost:5432/dropboard
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your-cron-secret
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=20
```

### 1.6 Configure Drizzle ORM
- [x] Create `drizzle.config.ts`
- [x] Create `src/db/index.ts` (postgres client + drizzle instance)

### 1.7 Create project folder structure
- [x] `src/db/schema/`
- [x] `src/lib/validations/`
- [x] `src/services/`
- [x] `src/middleware/`
- [x] `src/hooks/`
- [x] `src/stores/`
- [x] `src/types/`
- [x] `src/components/layout/`
- [x] `src/components/drops/`
- [x] `src/components/pinboard/`
- [x] `src/components/search/`
- [x] `src/components/team/`
- [x] `src/components/shared/`
- [x] `src/components/providers/`

### 1.8 Setup API response helpers
- [x] Create `src/lib/api-helpers.ts`
  - `successResponse(data, status?)`
  - `errorResponse(code, message, status)`
  - `paginatedResponse(data, meta)`
  - Standard `ApiResponse<T>` type

### 1.9 Setup custom error classes
- [x] Create `src/lib/errors.ts`
  - `AppError` (base)
  - `NotFoundError`
  - `ForbiddenError`
  - `ValidationError`
  - `QuotaExceededError`
  - `UnauthorizedError`

### 1.10 Setup constants
- [x] Create `src/lib/constants.ts`
  - `DEFAULT_RETENTION_DAYS = 7`
  - `MAX_UPLOAD_SIZE_BYTES`
  - `FREE_STORAGE_LIMIT_BYTES`
  - `FREE_PINNED_LIMIT = 50`
  - `ALLOWED_FILE_TYPES`
  - `ITEMS_PER_PAGE = 20`

### 1.11 Setup types
- [x] Create `src/types/index.ts`
- [x] Create `src/types/api.ts`

### 1.12 Setup Tanstack Query provider
- [x] Create `src/components/providers/query-provider.tsx`
- [x] Wrap app in root layout

### 1.13 Update root layout
- [x] Add QueryProvider
- [x] Add Sonner Toaster
- [x] Update metadata (title, description)
