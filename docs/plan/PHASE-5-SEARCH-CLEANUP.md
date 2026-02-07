# Phase 5: Search, Cleanup & Quota

**Goal:** Search fungsional, expired items auto-cleanup, storage quota enforced.

**Dependency:** Phase 3 + Phase 4 complete.

---

## Backend Checklist

### 5.1 Search service
- [ ] Create `src/services/search-service.ts`
  - `searchItems(workspaceId, query, filters, pagination)`
  - Search: title, content (note text / URL)
  - PostgreSQL ILIKE for MVP
  - Filters: type, is_pinned, date range
  - Sort: newest first
  - Pagination: offset-based

### 5.2 Search Zod validation
- [ ] Create `src/lib/validations/search.ts`
  - `searchQuerySchema`: q, type, is_pinned, page, limit

### 5.3 Search API route
- [ ] `app/api/v1/search/route.ts` → GET
  - Query params: q, workspace_id, type, is_pinned, page, limit

### 5.4 Cleanup service
- [ ] Create `src/services/cleanup-service.ts`
  - `cleanupExpiredItems()`
    1. Find items: expires_at <= now AND is_pinned = false
    2. Delete file from disk (if DROP)
    3. Delete file_asset record
    4. Delete item record
    5. Update workspace storage_used_bytes
  - Batch processing (N at a time)
  - Return count of deleted items

### 5.5 Cleanup cron API route
- [ ] `app/api/v1/cron/cleanup/route.ts` → POST
  - Verify `Authorization: Bearer <CRON_SECRET>`
  - Call cleanupExpiredItems()
  - Return count
  - Log execution

### 5.6 Quota service
- [ ] Integrate into workspace/file service:
  - `checkQuota(workspaceId, additionalBytes)` → throw if over
  - `updateStorageUsed(workspaceId, deltaBytes)` → atomic update
  - Limits: Free 2GB total, 20MB per file, 50 pinned items

### 5.7 Integrate quota into upload
- [ ] Before save: checkQuota()
- [ ] After save: updateStorageUsed(+size)
- [ ] After delete: updateStorageUsed(-size)

---

## Frontend Checklist

### 5.8 Build Search page
- [ ] `app/(dashboard)/search/page.tsx`
  - Search bar (auto-focus)
  - Filter chips: type, pinned toggle
  - Results list (mixed types)
  - Empty state, pagination
  - Responsive

### 5.9 Build Search Bar component
- [ ] `src/components/search/search-bar.tsx`
  - Debounced (300ms)
  - Keyboard shortcut: Cmd/Ctrl+K
  - Used in topbar (compact) and search page (full)

### 5.10 Build Search Results component
- [ ] `src/components/search/search-results.tsx`
  - Unified result card
  - Type icon, title, snippet, date, badge

### 5.11 Tanstack Query hook: useSearch
- [ ] `src/hooks/use-search.ts`
  - Debounced query
  - Loading/error/empty states

### 5.12 Build quota display in Settings
- [ ] Progress bar: used / total
  - Warning > 80%
  - Error state on exceeded
