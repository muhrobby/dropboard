# Phase 6: PWA, Polish & Deployment

**Goal:** App berfungsi sebagai PWA, responsive di semua device, siap deploy.

**Dependency:** Phase 5 complete.

---

## PWA Checklist

### 6.1 Install & configure next-pwa
- [ ] `pnpm add next-pwa`
- [ ] Update `next.config.ts` with withPWA wrapper
- [ ] Configure service worker registration

### 6.2 Create PWA manifest
- [ ] `app/manifest.ts`
  - name: "Dropboard"
  - short_name: "Dropboard"
  - start_url: "/drops"
  - display: "standalone"
  - theme_color, background_color
  - Icons: 192x192, 512x512

### 6.3 PWA icons
- [ ] Generate/create icon set
- [ ] Place in public/

### 6.4 Service worker caching
- [ ] Cache static assets (JS, CSS, fonts)
- [ ] Network-first for API calls
- [ ] Offline fallback page (optional)

### 6.5 Install prompt
- [ ] Detect `beforeinstallprompt`
- [ ] Custom install banner on mobile

---

## Responsive Polish Checklist

### 6.6 Audit all pages
- [ ] Login/Register: full-screen mobile, touch-friendly
- [ ] Drops: FAB, swipeable cards
- [ ] Pinboard: stacked cards, bottom sheet add
- [ ] Search: full-width input
- [ ] Team: card layout (not table) on mobile
- [ ] Activity: compact list
- [ ] Settings: simple form

### 6.7 Touch interactions
- [ ] Min 44px tap targets
- [ ] Touch-friendly dropdowns
- [ ] Swipe actions (optional)

### 6.8 Empty states for all lists
- [ ] Drops, Links, Notes, Search, Team, Activity

### 6.9 Loading skeletons
- [ ] Cards, lists, member list

### 6.10 Error boundaries
- [ ] `app/error.tsx`
- [ ] `app/(dashboard)/error.tsx`
- [ ] Component-level error handling

### 6.11 Toast notifications (Sonner)
- [ ] Upload success + pin CTA
- [ ] Pin/Unpin confirmation
- [ ] Delete confirmation
- [ ] Invite link copied
- [ ] Error messages
- [ ] Quota exceeded warning

---

## Deployment Checklist

### 6.12 Create Dockerfile
- [ ] Multi-stage build
- [ ] Node.js LTS base
- [ ] Copy only necessary files
- [ ] Expose port 3000

### 6.13 Create docker-compose.yml (production)
- [ ] Services: app + postgres
- [ ] Volumes: postgres data, uploads
- [ ] Health checks
- [ ] Environment from .env

### 6.14 Finalize .env.example
- [ ] All vars documented
- [ ] Secure defaults flagged

### 6.15 Build & smoke test
- [ ] `pnpm build` → no errors
- [ ] `pnpm start` → app loads
- [ ] Docker build + compose up

### 6.16 End-to-end flow test (manual)
- [ ] Register → personal workspace created
- [ ] Login → redirect to drops
- [ ] Upload from desktop (drag & drop)
- [ ] Upload from mobile (file picker)
- [ ] Default temporary 7-day retention
- [ ] Pin → permanent, Unpin → temporary
- [ ] Save link → auto-fetch title
- [ ] Create note
- [ ] Search items
- [ ] Create team workspace
- [ ] Generate + copy invite link
- [ ] Accept invite (different user)
- [ ] RBAC enforcement
- [ ] Activity log shows events
- [ ] Storage usage display
- [ ] PWA installable on mobile
- [ ] Responsive on mobile/tablet/desktop
- [ ] Cleanup cron deletes expired items
