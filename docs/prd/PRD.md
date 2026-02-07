# PRD Lengkap — Team Dropboard (Web + Mobile via PWA)

## 0. Ringkasan Produk

Team Dropboard adalah aplikasi web + mobile (PWA) untuk menyimpan dan mengelola:

- **Drop** (gambar/file sementara) untuk memindahkan konten cepat dari HP ke desktop tanpa lewat chat, dengan default **Temporary 7 hari**.
- **Pinboard** (link + notes permanen) untuk menyimpan referensi yang sering dipakai.
- **Workspace tim** (invite anggota, role-based access) untuk kolaborasi.

Pengguna bisa memilih **Permanent** saat upload (tetap default **Temporary 7 hari**). **Link/Notes** default **Permanent**.

---

## Stack : Nextjs + Drizzle ORM + Posgress + Shadcn Registry

## 1. Tujuan Produk

### 1.1 Tujuan Pengguna

- Mengurangi ketergantungan pada chat (WA/Telegram) untuk “temp storage”.
- Memudahkan akses ulang link/notes tanpa perlu search chat.
- Memudahkan drop screenshot dari HP lalu digunakan di desktop (PPT, dokumen, dsb).
- Memberikan ruang kerja tim (shared board) yang rapi dan cepat.

### 1.2 Tujuan Bisnis

- Membangun produk freemium dengan upsell pada storage, retention, team features, dan audit/integrations.
- Meningkatkan retensi melalui kebiasaan harian: “drop” dan “search”.
- Menawarkan paket Team untuk organisasi kecil/agency/ops team.

### 1.3 KPI Awal

- **Aktivasi:** user membuat item pertama dalam 10 menit setelah signup.
- **7-day retention:** user aktif di minggu berikutnya (≥ 1 item dibuat/diakses).
- **Conversion:** free → pro/team.
- **WA replacement proxy metric:** rata-rata item Drop per user per minggu.

---

## 2. Target Pengguna & Persona

### Persona A — Power User Personal

- Sering pindah device, sering screenshot, sering simpan link.
- Butuh cepat, tidak mau ribet struktur folder.

### Persona B — Ops/Agency Team

- Banyak link SOP, akses tools, dan asset quick share.
- Butuh workspace bersama, role, dan jejak aktivitas minimal.

### Persona C — Owner/Admin

- Mengatur workspace, invite anggota, kontrol akses.

---

## 3. Ruang Lingkup

### 3.1 In-Scope (MVP)

- Auth (register/login/logout)
- Workspace (personal & team)
- Invite member + roles
- Drop items (upload web/mobile; default temporary 7 hari; opsi permanent)
- Link items (save link; auto-title; tags; permanent)
- Note items (text; tags; permanent)
- Pin/unpin dan status retention
- Search & filter
- Activity log minimal
- Cleanup otomatis item expired
- UI PWA responsif + **tombol upload** (UX mobile & desktop)

### 3.2 Out-of-Scope (Fase berikutnya)

- Native app penuh (iOS/Android store)
- OCR search untuk gambar
- Virus scanning
- Integrasi otomatis (Slack/Drive) dan webhook/n8n
- Share Target API (direct share to PWA) jika butuh waktu tambahan
- End-to-end encryption untuk “password vault”
- Full password manager/secret manager

---

## 4. Prinsip Desain

- **Fast capture > perfect organization:** quick add & search dominan.
- **Temporary by default** untuk Drop agar storage hemat.
- **One UI, multi-device:** PWA, mobile-first, desktop-friendly.
- **Multi-tenant security:** isolasi workspace wajib.
- **Best-effort privacy:** kontrol akses workspace + signed access.

---

## 5. Terminologi & Model Data

### 5.1 Entitas Inti

- User
- Workspace: personal atau team
- WorkspaceMember: relasi user-workspace + role + status
- Invite: token undangan join workspace
- Item: objek utama (Drop/Link/Note)
- FileAsset: metadata file (untuk Drop)
- Tag (opsional MVP: tags sebagai string array di Item)
- ActivityLog: event penting

### 5.2 Tipe Item

- **DROP:** file/image (default temporary 7 hari)
- **LINK:** url + title + note (permanent)
- **NOTE:** text (permanent)

### 5.3 Retention & Status

Field minimal pada Item:

- `is_pinned` (boolean)
- `expires_at` (nullable datetime)
- `created_at`

Aturan:

- Drop default: `expires_at = now + 7 days`, `is_pinned=false`
- Permanent (Pinned): `expires_at=null`, `is_pinned=true`
- Unpin: `expires_at = now + 7 days`, `is_pinned=false`

---

## 6. Roles & Permission (RBAC)

### 6.1 Roles

- Owner
- Admin
- Member

### 6.2 Permission Matrix (MVP)

**Owner**

- Manage workspace settings
- Invite/remove members
- Change roles
- View activity log
- CRUD semua item

**Admin**

- CRUD semua item
- Invite members (opsional; default: boleh)
- Tidak bisa delete workspace
- Tidak bisa downgrade Owner

**Member**

- Create items
- View items
- Update/delete item miliknya (opsional) atau semua item (pilih salah satu)
  - Rekomendasi: Member bisa edit/delete item miliknya; bisa view semua.

Kebijakan edit/delete item tim (selain milik sendiri) bisa jadi toggle di workspace settings di fase lanjut.

---

## 7. User Flows

### 7.1 Onboarding

- User register → otomatis dibuat **Personal Workspace**
- User masuk ke Home (Drop page)
- Prompt: “Upload your first drop” + tombol upload

### 7.2 Drop dari Mobile

- User buka PWA → tab Drop
- Tap Upload → pilih foto/file
- Modal bottom sheet:
  - preview
  - title/note/tags (opsional)
  - retention selector (Temporary default / Permanent)
- Upload → item muncul di list

### 7.3 Drop dari Desktop

- Drag & drop ke drop zone **atau** klik Upload
- Modal upload (same fields)
- Upload → item muncul

### 7.4 Simpan Link/Note

- Quick add: paste link → fetch title → save
- Notes: tambah text + tags → save

### 7.5 Pin/Unpin

- Pin dari list → item jadi permanent
- Unpin → item jadi temporary 7 hari sejak unpin

### 7.6 Workspace Tim

- Owner create team workspace
- Owner invite via email/phone identifier
- Invitee buka link token → login/register → accept
- Invitee masuk workspace tim dan bisa add items

---

## 8. Kebutuhan Fitur (Detailed Requirements)

### 8.1 Authentication

**Requirement**

- Register, login, logout
- Password hashing aman
- Session/JWT

**Acceptance Criteria**

- User dapat login dan melihat workspace list
- Rate limit login basic
- Reset password (bisa V1.1 jika perlu)

### 8.2 Workspace

**Requirement**

- Personal workspace otomatis
- Create team workspace
- Workspace switcher

Fields: `name`, `type (personal/team)`, `created_by`, `created_at`

**Acceptance Criteria**

- User bisa pindah workspace dan UI menampilkan data sesuai workspace aktif
- Tidak ada akses workspace tanpa membership

### 8.3 Team Invite & Membership

**Requirement**

- Owner/Admin create invite: target (email/phone string), role, expiry token (mis. 7 hari)
- Accept invite: token valid → join membership active

**Acceptance Criteria**

- Token unik, tidak mudah ditebak
- Invite bisa dibatalkan
- User yang sudah member tidak bisa di-invite ulang (atau invite jadi no-op)
- Role berubah langsung berlaku

### 8.4 Drop Items (File/Image)

**Requirement**
Upload via:

- Desktop: drag & drop + tombol Upload
- Mobile: tombol Upload (file picker)

Upload modal:

- Preview
- Title (default filename)
- Note (optional)
- Tags (optional)
- Retention selector:
  - Temporary (7 days) default
  - Permanent
- Workspace selector (jika multi-workspace)

Post-upload:

- item muncul di list
- toast + aksi “Pin now” jika temporary

List view:

- Today / This Week grouping
- Info “Expires in X days” untuk temporary
- Actions: Pin/Unpin, Download, Delete

**Acceptance Criteria**

- Default upload menghasilkan temporary 7 hari
- Permanent saat upload → tidak punya `expires_at`
- Unpin menghasilkan `expires_at = now + 7 days`
- File hanya bisa diakses oleh anggota workspace (kecuali ada share link fitur v1.1)

### 8.5 Link Items

**Requirement**
Create link item:

- url mandatory
- fetch title server-side (best effort)
- notes optional
- tags optional
- Default permanent

**Acceptance Criteria**

- Link tersimpan dan bisa dibuka dari UI
- Jika fetch title gagal, fallback ke url hostname

### 8.6 Note Items

**Requirement**
Create note item:

- text required
- tags optional
- Default permanent

**Acceptance Criteria**

- Notes searchable

### 8.7 Search & Filter

**Requirement**
Global search dalam workspace:

- query string
- filter by type (drop/link/note)
- filter pinned/permanent vs temporary
- sort (newest)

Minimum: search title + note text + url

**Acceptance Criteria**

- Search hasil relevan dalam 1–2 detik untuk dataset kecil-menengah
- Pagination untuk list

### 8.8 Activity Log

**Requirement**  
Catat event:

- ITEM_CREATED
- ITEM_DELETED
- ITEM_PINNED
- ITEM_UNPINNED
- INVITE_SENT
- INVITE_ACCEPTED
- MEMBER_ROLE_CHANGED

**Acceptance Criteria**

- Owner/Admin bisa melihat activity log
- Log menyimpan actor, workspace, timestamp

### 8.9 Retention Cleanup (Auto Delete)

**Requirement**
Scheduled job minimal 1x/hari:

- cari item `expires_at <= now` dan `is_pinned=false`
- delete item record + file asset dari storage  
  Optional: soft delete/trash di V1.1

**Acceptance Criteria**

- Item expired tidak muncul di list
- File benar-benar terhapus dari storage (atau masuk state pending delete)

### 8.10 Storage & Quota

**Requirement**

- Track total storage per workspace/user (basic)
- Limit upload size per plan
- Reject upload jika kuota habis

**Acceptance Criteria**

- Saat limit tercapai, UI menampilkan pesan yang jelas + CTA upgrade

---

## 9. Non-Functional Requirements

### 9.1 Security

- Workspace isolation enforced di semua endpoint
- Token invite dan item id tidak dapat ditebak (UUID/ULID + token hash)
- Signed URL untuk file download / streaming
- Rate limit upload & download basic
- Logging akses admin actions

### 9.2 Performance

- List & search pagination
- Thumbnail/preview untuk gambar (optional) agar UI cepat
- Upload resumable (out-of-scope MVP, bisa belakangan)

### 9.3 Reliability

- Retry upload (client-side)
- Backup DB (infra)

### 9.4 Privacy

- Auto-delete default untuk drop items
- Tidak ada indexing publik

---

## 10. Analytics (Product Events)

Track:

- `workspace_created`
- `item_created` (type)
- `item_pinned` / `item_unpinned`
- `search_performed`
- `upload_failed_reason`
- `invite_sent` / `invite_accepted`

---

## 11. Monetisasi & Packaging (Draft)

### Free

- Personal workspace + 1 team workspace (opsional)
- Storage kecil (mis. 1–2 GB)
- Temporary 7 hari fixed
- Pinned limit (mis. 50)
- Upload max 20MB

### Pro

- Storage 20–50 GB
- Pinned unlimited
- Retention extension (14/30/90 hari)
- Batch actions

### Team

- Multi-user, roles, audit log
- Shared workspace unlimited
- Admin policies

Add-ons:

- Extra storage
- OCR search (later)
- Integrations/webhooks (later)

---

## 12. Roadmap

### v1 (MVP)

- Auth, Workspace, Drop (upload + retention), Link/Note, Search, Team invite, Cleanup job

### v1.1

- Trash/restore
- Share Target API (send from share sheet directly)
- Batch actions
- Share read-only link item (opsional)

### v1.2

- n8n/webhook integration
- OCR search
- Virus scan for business

---

## 13. Risks & Mitigation

- Abuse upload → rate limit + allowlist file types + size cap
- Storage cost → default retention 7 hari + pinned limit free
- Data leak → strict RBAC middleware + tests
- UX mobile share → fallback upload button dulu, share target belakangan

---

## 14. Daftar Halaman UI (MVP)

- Login / Register
- Drop (Today/This Week, upload, filters)
- Pinboard (Links & Notes, quick add)
- Search (global)
- Workspace switcher
- Team (members, invites)
- Settings (workspace name, usage/quota)
- Activity log (owner/admin)

---

## 15. Acceptance Checklist MVP (Go/No-Go)

- User bisa upload dari HP & web dengan tombol upload yang jelas
- Default drop item auto-expire 7 hari, dan cleanup berjalan
- User bisa pin saat upload atau setelah upload
- Link/notes permanen dan searchable
- Workspace tim + invite berjalan end-to-end
- Data tidak bocor antar workspace (uji minimal)
