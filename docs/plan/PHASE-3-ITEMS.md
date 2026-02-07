# Phase 3: Items Core (Drop, Link, Note)

**Goal:** User bisa upload Drop (file/image), save Link, create Note. Pin/Unpin bekerja.

**Dependency:** Phase 2 complete.

---

## Backend Checklist

### 3.1 Define DB schema: items
- [x] Create `src/db/schema/items.ts`
  - Fields per PLAN.md schema
  - Indexes: (workspace_id, type), (workspace_id, created_at), (expires_at)

### 3.2 Define DB schema: file_assets
- [x] Create `src/db/schema/file-assets.ts`
  - Fields per PLAN.md schema

### 3.3 Run migration for items + file_assets

### 3.4 File storage service
- [x] Create `src/lib/file-storage.ts`
  - `saveFile(buffer, originalName, mimeType, workspaceId)` → save to uploads/{workspaceId}/
  - `deleteFile(storagePath)` → remove from disk
  - `getSignedUrl(fileAssetId, expiresInSeconds)` → HMAC-SHA256 token
  - `verifySignedUrl(fileAssetId, token, expires)` → verify
  - Ensure upload directory exists

### 3.5 Item service
- [x] Create `src/services/item-service.ts`
  - `createItem(data)` → insert with retention logic
  - `listItems(workspaceId, filters, pagination)` → list with filters, exclude expired
  - `getItem(id)` → single item with file_asset join
  - `updateItem(id, data)` → update title, note, tags
  - `deleteItem(id)` → delete item + file_asset + file
  - `pinItem(id)` → set is_pinned=true, expires_at=null
  - `unpinItem(id)` → set is_pinned=false, expires_at=now+7days

### 3.6 File service
- [x] Create `src/services/file-service.ts`
  - `uploadFile(workspaceId, userId, file)` → validate, save, create record
  - `getFileForDownload(fileAssetId)` → return file path
  - `deleteFileAsset(id)` → delete record + file
  - File type validation (images, documents, text, zip)
  - Max size validation

### 3.7 Item Zod validations
- [x] Create `src/lib/validations/item.ts`
  - `createDropSchema`, `createLinkSchema`, `createNoteSchema`
  - `updateItemSchema`
  - `listItemsQuerySchema`

### 3.8 Link title fetcher
- [x] Utility to fetch `<title>` from URL
  - Timeout 5s
  - Fallback: URL hostname

### 3.9 Items API routes
- [x] `app/api/v1/items/route.ts` → GET (list), POST (create link/note)
- [x] `app/api/v1/items/[id]/route.ts` → GET, PATCH, DELETE
- [x] `app/api/v1/items/[id]/pin/route.ts` → POST (pin), DELETE (unpin)

### 3.10 File API routes
- [x] `app/api/v1/files/upload/route.ts` → POST (multipart)
- [x] `app/api/v1/files/[id]/route.ts` → GET (signed download)

---

## Frontend Checklist

### 3.11 Build Drops page
- [x] `app/(dashboard)/drops/page.tsx`
  - Header: title + Upload button
  - Filter tabs: All / Images / Files
  - Toggle: pinned / temporary / all
  - Date grouping: Today, This Week, Earlier
  - FAB on mobile for upload
  - Empty state

### 3.12 Build Drop Card
- [x] `src/components/drops/drop-card.tsx`
  - Thumbnail preview (images) / file icon
  - Title, size, date
  - Retention badge
  - Actions: Pin/Unpin, Download, Delete

### 3.13 Build Upload Modal
- [x] `src/components/drops/upload-modal.tsx`
  - Desktop: centered dialog
  - Mobile: bottom sheet
  - Drop zone + file picker
  - Preview, title, note, tags
  - Retention selector (Temporary default / Permanent)
  - Upload button + progress

### 3.14 Build Upload Dropzone
- [x] `src/components/drops/upload-dropzone.tsx`
  - Drag & drop with visual feedback
  - File type & size client-side validation

### 3.15 Build Retention Badge
- [x] `src/components/drops/retention-badge.tsx`
  - "Expires in X days" (yellow), "Permanent" (green)

### 3.16 Build Pinboard page
- [x] `app/(dashboard)/pinboard/page.tsx`
  - Tabs: Links / Notes
  - Quick add bar at top
  - Card grid/list

### 3.17 Build Add Link Form
- [x] `src/components/pinboard/add-link-form.tsx`
  - URL input, auto-fetch title, optional note/tags, save

### 3.18 Build Add Note Form
- [x] `src/components/pinboard/add-note-form.tsx`
  - Textarea, optional title/tags, save

### 3.19 Build Link Card
- [x] `src/components/pinboard/link-card.tsx`
  - Favicon + title + URL + tags + actions

### 3.20 Build Note Card
- [x] `src/components/pinboard/note-card.tsx`
  - Title + preview + tags + actions

### 3.21 Build shared components
- [x] Pin Button (`src/components/shared/pin-button.tsx`)
- [x] Tag Input (`src/components/shared/tag-input.tsx`)
- [x] Confirm Dialog (`src/components/shared/confirm-dialog.tsx`)
- [x] Empty State (`src/components/shared/empty-state.tsx`)

### 3.22 Tanstack Query hooks
- [x] `src/hooks/use-items.ts` — CRUD + pin/unpin
- [x] `src/hooks/use-upload.ts` — file upload with progress

### 3.23 Zustand UI store
- [x] `src/stores/ui-store.ts` — modal states, active tabs
