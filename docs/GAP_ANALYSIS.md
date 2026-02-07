# PRD Gap Analysis & Next Steps

> Dokumen ini menganalisis status implementasi berdasarkan [PRD.md](./prd/PRD.md) dan merencanakan langkah selanjutnya.

---

## 1. Status Implementasi MVP

### ✅ Sudah Diimplementasi

| Fitur              | Status      | Catatan                                        |
| ------------------ | ----------- | ---------------------------------------------- |
| **Authentication** | ✅ Complete | Register, login, logout dengan Better Auth     |
| **Workspace**      | ✅ Complete | Personal & team workspace, switcher            |
| **Drop Items**     | ✅ Complete | Upload, preview, retention (7 hari), pin/unpin |
| **Link Items**     | ✅ Complete | Auto-fetch title, permanent default            |
| **Note Items**     | ✅ Complete | Text dengan tags, permanent default            |
| **Team Invite**    | ✅ Complete | Token-based invite, role assignment            |
| **Search**         | ✅ Complete | Global search dalam workspace                  |
| **Activity Log**   | ✅ Complete | Event tracking untuk owner/admin               |
| **Cleanup Job**    | ✅ Complete | Cron endpoint untuk auto-delete expired items  |
| **Storage Quota**  | ✅ Complete | Tracking & limit enforcement                   |
| **UI PWA**         | ✅ Complete | Responsive, mobile-first                       |
| **Rate Limiting**  | ✅ Complete | Basic rate limit untuk API                     |

### ⚠️ Perlu Perbaikan/Enhancement

| Fitur                  | Status             | Detail                                                                  |
| ---------------------- | ------------------ | ----------------------------------------------------------------------- |
| **Upload Flow Mobile** | ⚠️ Bisa Lebih Baik | Bottom sheet upload modal belum optimal                                 |
| **Retention Selector** | ⚠️ Sederhana       | Hanya toggle pinned, belum ada visual "Temporary/Permanent" saat upload |
| **Thumbnail/Preview**  | ⚠️ Basic           | Belum ada thumbnail optimization untuk load cepat                       |
| **Batch Actions**      | ⚠️ Belum Ada       | Tidak ada multi-select untuk pin/delete                                 |

### ❌ Belum Diimplementasi (MVP Scope)

| Fitur               | Prioritas | Catatan                                                            |
| ------------------- | --------- | ------------------------------------------------------------------ |
| **Reset Password**  | Medium    | Disebutkan di PRD sebagai V1.1, tapi penting untuk user experience |
| **Tags System**     | Low       | PRD menyebut tags, saat ini hanya string tanpa UI filter           |
| **Toast "Pin Now"** | Low       | Post-upload CTA untuk temporary items                              |

---

## 2. Status Fitur V1.1 (Out of MVP)

| Fitur                | Status   | Notes                            |
| -------------------- | -------- | -------------------------------- |
| Trash/Restore        | ❌ Belum | Soft delete, recovery period     |
| Share Target API     | ❌ Belum | Direct share dari share sheet OS |
| Batch Actions        | ❌ Belum | Multi-select operations          |
| Share Read-only Link | ❌ Belum | Public link untuk item tertentu  |

---

## 3. Status Fitur V1.2 (Future)

| Fitur                   | Status   | Notes                        |
| ----------------------- | -------- | ---------------------------- |
| n8n/Webhook Integration | ❌ Belum | External automation          |
| OCR Search              | ❌ Belum | Text extraction dari gambar  |
| Virus Scan              | ❌ Belum | Security untuk business tier |

---

## 4. Non-Functional Requirements

| Requirement             | Status     | Notes                       |
| ----------------------- | ---------- | --------------------------- |
| **Workspace Isolation** | ✅         | Middleware enforced         |
| **Signed URL**          | ✅         | File access via signed URLs |
| **Rate Limit**          | ✅         | Basic implementation        |
| **Pagination**          | ✅         | List & search paginated     |
| **Thumbnail**           | ⚠️ Partial | Belum optimized             |
| **Resumable Upload**    | ❌         | Out-of-scope MVP            |

---

## 5. Roadmap & Next Steps

### Phase 1: UX Polish (Prioritas Tinggi)

1. **Improve Upload Modal**
   - Tambah retention selector yang jelas (Temporary 7d / Permanent)
   - Preview yang lebih baik
   - Progress indicator

2. **Post-Upload Toast**
   - Toast dengan CTA "Pin Now" untuk temporary items

3. **Tags UI Enhancement**
   - Filter by tags di search/list
   - Tag autocomplete

### Phase 2: V1.1 Features

1. **Reset Password Flow**
   - Email verification
   - Password reset link

2. **Trash & Restore**
   - Soft delete dengan 7-day recovery
   - Trash view page

3. **Batch Actions**
   - Multi-select mode
   - Bulk pin/unpin/delete

### Phase 3: Share Features

1. **Share Read-only Link**
   - Generate public link untuk item
   - Expiry setting

2. **Share Target API (PWA)**
   - Integrasi dengan OS share sheet
   - Butuh HTTPS dan manifest update

### Phase 4: V1.2 Features (Long-term)

1. **Webhook/n8n Integration**
2. **OCR Search**
3. **Virus Scan**

---

## 6. Technical Debt

| Item                                  | Priority | Action                 |
| ------------------------------------- | -------- | ---------------------- |
| Missing `checkbox` component          | High     | Install via shadcn CLI |
| Implicit `any` types di `columns.tsx` | Medium   | Add proper typing      |
| Console logs cleanup                  | Low      | Sudah sebagian bersih  |

---

## 7. Kesimpulan

**MVP sudah ~90% complete.** Fitur inti (Drop, Link, Note, Team, Search, Activity) berfungsi dengan baik.

**Rekomendasi prioritas:**

1. Polish UX upload flow (retention selector, toast)
2. Implement Reset Password
3. Add Trash/Restore
4. Consider Share features

---

_Last updated: 2026-02-08_
