# Dropboard Admin System & Tier Pricing Plan

## Overview

Dropboard sebagai produk bisnis memerlukan 2 sistem terpisah:

1. **Admin Portal** - Sistem internal untuk mengelola produk (hanya akses tim internal)
2. **Product Dashboard** - Aplikasi utama yang digunakan user (sudah ada, perlu modifikasi)

---

## 1. Pricing Tiers

### Free Tier (Gratis)
| Feature | Limit |
|---------|-------|
| Workspaces | 1 personal |
| Team Members | ❌ Tidak tersedia |
| Storage | 2 GB |
| File Upload Size | 10 MB/file |
| Retention | 7 days (temporary) |
| Webhooks | ❌ |
| Priority Support | ❌ |

### Pro Tier
| Feature | Limit |
|---------|-------|
| Workspaces | 1 personal + 2 team |
| Team Members | 5 per team |
| Storage | 10 GB |
| File Upload Size | 50 MB/file |
| Retention | 30 days + permanent option |
| Webhooks | 3 webhooks |
| Priority Support | ❌ |

### Business Tier (Tertinggi)
| Feature | Limit |
|---------|-------|
| Workspaces | Unlimited |
| Team Members | 20 per team |
| Storage | 50 GB |
| File Upload Size | 100 MB/file |
| Retention | Unlimited |
| Webhooks | Unlimited |
| Priority Support | ✅ Email |
| Custom Branding | ✅ |
| SSO Integration | ✅ |

> **Note:** Harga tier dapat dikonfigurasi melalui Admin Portal

---

## 2. Wallet/Balance System

### 2.1 Konsep

User memiliki **saldo (wallet)** yang digunakan untuk:
- Upgrade tier
- Perpanjang subscription (auto-renewal)
- Pembayaran lainnya di masa depan

### 2.2 Top-Up Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     TOP-UP SALDO                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Quick Amount:                                              │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐                   │
│  │ Rp10.000 │ │ Rp50.000 │ │ Rp100.000 │                   │
│  └──────────┘ └──────────┘ └───────────┘                   │
│                                                             │
│  Custom Amount:                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ Rp _______________                  │                   │
│  └─────────────────────────────────────┘                   │
│  Min: Rp10.000 | Max: Rp10.000.000                         │
│                                                             │
│                              [Continue to Payment]          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PILIH METODE PEMBAYARAN                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Bank Transfer (Virtual Account)                            │
│  ○ BCA  ○ Mandiri  ○ BNI  ○ BRI                            │
│                                                             │
│  E-Wallet                                                   │
│  ○ OVO  ○ DANA  ○ GoPay  ○ ShopeePay                       │
│                                                             │
│  QRIS (Semua E-Wallet & Mobile Banking)                    │
│  ○ Scan QR Code                                             │
│                                                             │
│                              [Pay Now]                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   Payment Gateway Processing
                    (Xendit atau DOKU)
                              │
                              ▼
              ┌───────────────────────────────┐
              │  ✅ Top-up Successful!        │
              │  Saldo: Rp50.000 → Rp150.000  │
              └───────────────────────────────┘
```

### 2.3 Auto-Renewal

```
Setiap hari jam 00:00 WIB, sistem cek:

┌──────────────────────────────────────────────────────────┐
│ FOR EACH subscription WHERE auto_renewal = true:          │
│                                                           │
│ IF expires_at <= NOW() + 3 days:                         │
│   IF wallet_balance >= tier_price:                       │
│     → Deduct balance                                      │
│     → Extend subscription                                 │
│     → Send success email                                  │
│   ELSE:                                                   │
│     → Send "Saldo tidak cukup" reminder email            │
│     → Remind again 1 day before expiry                   │
│                                                           │
│ IF expires_at <= NOW() AND balance < tier_price:         │
│   → Downgrade to FREE                                     │
│   → Send downgrade notification                           │
└──────────────────────────────────────────────────────────┘
```

### 2.4 Database Schema

```sql
-- User wallet
CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  balance BIGINT NOT NULL DEFAULT 0, -- dalam rupiah
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Semua transaksi wallet (immutable audit log)
CREATE TABLE wallet_transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  type TEXT NOT NULL, -- 'topup', 'subscription', 'refund'
  amount BIGINT NOT NULL, -- positif = masuk, negatif = keluar
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  description TEXT NOT NULL,
  reference_id TEXT, -- payment gateway invoice id atau subscription id
  gateway_payment_id TEXT, -- ID dari Xendit/DOKU
  gateway_provider TEXT, -- 'xendit' atau 'doku'
  status TEXT DEFAULT 'completed', -- pending, completed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Audit fields
  ip_address TEXT,
  user_agent TEXT
);

-- Top-up orders (pending payments)
CREATE TABLE topup_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount BIGINT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, expired, failed
  payment_method TEXT,
  gateway_provider TEXT NOT NULL, -- 'xendit' atau 'doku'
  gateway_invoice_id TEXT,
  gateway_invoice_url TEXT,
  expires_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- System activity logs (untuk monitoring)
CREATE TABLE system_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL, -- 'info', 'warning', 'error', 'critical'
  category TEXT NOT NULL, -- 'payment', 'subscription', 'auth', 'system'
  message TEXT NOT NULL,
  metadata JSONB,
  user_id TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment gateway configuration
CREATE TABLE payment_gateway_config (
  id TEXT PRIMARY KEY,
  provider TEXT UNIQUE NOT NULL, -- 'xendit', 'doku'
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false, -- Gateway utama yang digunakan
  config JSONB, -- Encrypted configuration
  supported_methods TEXT[], -- ['va', 'ewallet', 'qris', 'cc']
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.5 Security Measures

| Concern | Solution |
|---------|----------|
| **Balance Manipulation** | Admin TIDAK bisa add saldo manual. Semua harus via Payment Gateway. |
| **Transaction Integrity** | wallet_transactions immutable, ada balance_before/after |
| **Double Spending** | Database transaction dengan row locking |
| **Audit Trail** | Semua aksi ter-log dengan timestamp, IP, user agent |
| **Refund** | Hanya bisa via Gateway refund API, ter-log sebagai transaksi |

### 2.6 Admin Monitoring (Read-Only untuk Balance)

Admin bisa:
- ✅ Lihat saldo user
- ✅ Lihat transaction history
- ✅ Lihat failed transactions
- ✅ Trigger refund (via Gateway API, ter-log)
- ❌ **TIDAK BISA** add saldo manual
- ❌ **TIDAK BISA** edit balance directly

---

## 3. Multi-Gateway Payment System

### 3.1 Supported Gateways

| Gateway | Website | Features |
|---------|---------|----------|
| **Xendit** | xendit.co | VA, E-Wallet, QRIS, CC |
| **DOKU** | doku.com | VA, E-Wallet, QRIS, CC, Retail (Alfamart/Indomaret) |

### 3.2 Gateway Selection (Admin Configurable)

Admin dapat mengaktifkan salah satu atau kedua gateway via Admin Portal:

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Payment Gateway Settings                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Xendit                                               │   │
│  │                                                      │   │
│  │ Status: ● Active              [Set as Primary]      │   │
│  │ API Key: xxxxxxxx-xxxx-xxxx   [Update Keys]        │   │
│  │ Callback Token: ●●●●●●●●                            │   │
│  │ Methods: ✅ VA ✅ E-Wallet ✅ QRIS ❌ CC            │   │
│  │                                                      │   │
│  │                              [Test Connection]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ DOKU                                                 │   │
│  │                                                      │   │
│  │ Status: ○ Inactive            [Activate]            │   │
│  │ Client ID: Not configured     [Configure]           │   │
│  │ Secret Key: Not configured                          │   │
│  │ Methods: ❌ VA ❌ E-Wallet ❌ QRIS ❌ CC            │   │
│  │                                                      │   │
│  │                              [Test Connection]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️ At least one gateway must be active                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Gateway Abstraction Layer

```typescript
// lib/payment/gateway.ts
interface PaymentGateway {
  createInvoice(params: CreateInvoiceParams): Promise<Invoice>;
  verifyWebhook(request: Request): boolean;
  getPaymentStatus(invoiceId: string): Promise<PaymentStatus>;
  refund(paymentId: string, amount: number): Promise<RefundResult>;
}

// lib/payment/xendit.ts
class XenditGateway implements PaymentGateway { ... }

// lib/payment/doku.ts  
class DOKUGateway implements PaymentGateway { ... }

// lib/payment/index.ts
export function getActiveGateway(): PaymentGateway {
  const config = await db.query(`
    SELECT * FROM payment_gateway_config 
    WHERE is_active = true AND is_primary = true
  `);
  
  if (config.provider === 'xendit') return new XenditGateway(config);
  if (config.provider === 'doku') return new DOKUGateway(config);
  throw new Error('No active payment gateway');
}
```

### 3.4 Fallback Strategy

```
User request payment
        │
        ▼
┌─────────────────┐
│ Primary Gateway │ (misal: Xendit)
└────────┬────────┘
         │
    ┌────┴────┐
    │ Success?│
    └────┬────┘
    yes  │  no
    ┌────┴────┐
    │         ▼
    │  ┌──────────────┐
    │  │ Log error    │
    │  │ Try fallback │
    │  └──────┬───────┘
    │         │
    │         ▼
    │  ┌─────────────────┐
    │  │ Secondary       │ (misal: DOKU)
    │  │ Gateway         │
    │  └────────┬────────┘
    │           │
    └─────┬─────┘
          ▼
    Return result
```

### 3.5 Environment Variables

```env
# Xendit
XENDIT_SECRET_KEY=xnd_development_xxxxx
XENDIT_PUBLIC_KEY=xnd_public_development_xxxxx
XENDIT_CALLBACK_TOKEN=xxxxx

# DOKU
DOKU_CLIENT_ID=xxxxx
DOKU_SECRET_KEY=xxxxx
DOKU_NOTIFICATION_TOKEN=xxxxx

# General
ACTIVE_PAYMENT_GATEWAY=xendit # atau 'doku', configurable via admin
```

---

## 4. Admin Portal

### 4.1 Menu Structure

```
/admin
├── /dashboard           <- Overview metrics
├── /users               <- User management
├── /orders              <- Top-up & payment orders
├── /subscriptions       <- Subscription management
├── /wallets             <- Wallet monitoring (read-only)
├── /tiers               <- Pricing tier configuration
├── /logs                <- Activity logs
├── /payment-gateways    <- Gateway configuration (NEW)
└── /settings            <- System settings
```

### 4.2 Orders Menu

| Column | Description |
|--------|-------------|
| Order ID | Unique identifier |
| User | User email/name |
| Amount | Rp xxx.xxx |
| Gateway | Xendit / DOKU |
| Payment Method | VA/E-Wallet/QRIS |
| Status | Pending/Paid/Expired/Failed |
| Created At | Timestamp |
| Paid At | Timestamp (if paid) |
| Actions | View Detail, Retry (if failed) |

**Features:**
- Filter by status, gateway, date range, payment method
- Search by user email atau order ID
- Export to CSV
- Quick action: Mark as manual verified (jika webhook gagal tapi sudah bayar)

### 4.3 Activity Logs Menu

| Column | Description |
|--------|-------------|
| Timestamp | When it happened |
| Level | Info/Warning/Error/Critical |
| Category | Payment/Subscription/Auth/System |
| Message | What happened |
| User | Affected user (if any) |
| IP Address | Request origin |

**Filters:**
- By level (Error, Warning, Critical)
- By category
- By date range
- By user

**Alert System:**
- Critical errors → Email notification ke admin
- Failed payments berulang → Alert
- Gateway down → Immediate alert

### 4.4 Payment Gateways Menu (NEW)

Features:
- View all configured gateways
- Activate/deactivate gateway
- Set primary gateway
- Configure API keys (encrypted)
- Test connection
- View gateway health status
- Transaction stats per gateway

### 4.5 Wallets Menu (Read Only)

| Column | Description |
|--------|-------------|
| User | Email/Name |
| Balance | Current balance |
| Total Top-up | Lifetime top-up amount |
| Total Spent | Lifetime spending |
| Last Transaction | Date of last transaction |
| Actions | View History, View User |

**Tidak ada tombol "Add Balance"** - Semua saldo hanya bisa masuk via Payment Gateway.

---

## 5. Product Dashboard Changes

### 5.1 New Wallet Section

```
┌─────────────────────────────────────────────────────────────┐
│  💰 Saldo Saya                                              │
│                                                             │
│  Rp 150.000                            [+ Top Up]           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Riwayat Transaksi                                          │
│  ├─ 09 Feb 2026  Top-up via BCA VA        +Rp 100.000      │
│  ├─ 09 Feb 2026  Subscription Pro         -Rp 99.000       │
│  └─ 01 Feb 2026  Top-up via OVO           +Rp 50.000       │
│                                                             │
│                                    [Lihat Semua →]          │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Subscription Management

```
┌─────────────────────────────────────────────────────────────┐
│  📋 Langganan Saya                                          │
│                                                             │
│  Plan: Pro                                                  │
│  Berlaku hingga: 09 Maret 2026                             │
│  Auto-renewal: ✅ Aktif                                     │
│                                                             │
│  Harga bulan depan: Rp 99.000                              │
│  Saldo saat ini: Rp 150.000 ✅ Cukup                        │
│                                                             │
│  [Ubah Plan] [Batalkan Auto-renewal]                       │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Transaction History Page

Full history dengan:
- Filter by type (top-up, subscription, refund)
- Filter by date
- Export to PDF (invoice)

---

## 6. Payment Integration

### 6.1 API Endpoints

```typescript
// User-facing
POST /api/v1/wallet/topup      // Create top-up order
GET  /api/v1/wallet/balance    // Get current balance
GET  /api/v1/wallet/history    // Transaction history

// Webhooks dari Payment Gateways
POST /api/webhooks/xendit/invoice    // Xendit payment notification
POST /api/webhooks/xendit/refund     // Xendit refund notification
POST /api/webhooks/doku/notification // DOKU payment notification
POST /api/webhooks/doku/refund       // DOKU refund notification

// Admin
GET  /api/admin/orders                  // List orders
POST /api/admin/orders/:id/verify       // Manual verify
GET  /api/admin/payment-gateways        // List gateways
PUT  /api/admin/payment-gateways/:id    // Update gateway config
POST /api/admin/payment-gateways/:id/test // Test connection
```

### 6.2 Webhook Verification

```typescript
// Verify callback dari Xendit
function verifyXenditWebhook(req: Request): boolean {
  const xCallbackToken = req.headers['x-callback-token'];
  return xCallbackToken === process.env.XENDIT_CALLBACK_TOKEN;
}

// Verify callback dari DOKU
function verifyDOKUWebhook(req: Request): boolean {
  const signature = req.headers['signature'];
  const clientId = req.headers['client-id'];
  const timestamp = req.headers['request-timestamp'];
  
  const calculated = calculateDOKUSignature(req.body, timestamp);
  return signature === calculated && clientId === process.env.DOKU_CLIENT_ID;
}
```

---

## 7. Implementation Phases

### Phase 1: Database & Wallet Core (Week 1-2) ✅
- [x] Add pricing_tiers table
- [x] Add wallets table
- [x] Add wallet_transactions table
- [x] Add topup_orders table
- [x] Add system_logs table
- [x] Add payment_gateway_config table
- [x] Create wallet utilities (`lib/wallet.ts`)
- [x] Create gateway abstraction layer (`lib/payment-gateway.ts`)
- [x] Create tier-check utilities (`lib/tier-guard.ts`)
- [x] Generate migrations with drizzle-kit
- [x] Push migrations to database


### Phase 2: Payment Gateway Integration (Week 3-4) ✅
- [x] Xendit SDK integration (`lib/payment-gateway.ts`)
- [x] DOKU SDK integration (`lib/payment-gateway.ts`)
- [x] Gateway abstraction implementation
- [x] Webhook handlers for Xendit (`app/api/webhooks/xendit/invoice/route.ts`)
- [x] Webhook handlers for DOKU (`app/api/webhooks/doku/notification/route.ts`)
- [x] Wallet API endpoints (`app/api/v1/wallet/*`)
- [x] System logger utility (`lib/system-logger.ts`)
- [x] Seed script for pricing tiers and gateways (`db/seed.ts`)


### Phase 3: Product UI - Wallet (Week 5-6) ✅
- [x] Wallet balance display (`components/wallet/wallet-balance.tsx`)
- [x] Top-up UI & Flow (`components/wallet/topup-modal.tsx`)
- [x] Transaction history view (`components/wallet/transaction-history.tsx`)
- [x] Billing page integration (`app/dashboard/settings/billing/page.tsx`)
- [x] Sidebar update

### Phase 4: Admin Portal (Week 7-8) ✅
- [x] RBAC system with role field (user/admin/super_admin)
- [x] Admin guard middleware (`middleware/admin-guard.ts`)
- [x] Permission system (`lib/permissions.ts`)
- [x] Admin layout with auth protection (`app/admin/layout.tsx`)
- [x] Admin sidebar navigation (`components/admin/admin-sidebar.tsx`)
- [x] Dashboard overview (`app/admin/page.tsx`)
- [x] Orders menu (`app/admin/orders/page.tsx`)
- [x] Wallets menu - read-only (`app/admin/wallets/page.tsx`)
- [x] Activity logs menu (`app/admin/logs/page.tsx`)
- [x] Payment gateways configuration menu (`app/admin/gateways/page.tsx`)
- [x] User management + wallet view (`app/admin/users/page.tsx`)
- [x] Admin settings page (`app/admin/settings/page.tsx`)
- [x] Admin portal link in user sidebar (role-based visibility)
- [x] Protected API endpoints with admin guard:
  - [x] GET /api/v1/admin/stats
  - [x] GET /api/v1/admin/users
  - [x] GET /api/v1/admin/orders
  - [x] GET /api/v1/admin/wallets
  - [x] GET /api/v1/admin/logs
  - [x] GET/PUT /api/v1/admin/gateways (super_admin only)
  - [x] GET /api/v1/me (returns user role & permissions)

### Phase 5: Auto-Renewal & Polish (Week 9-10)
- [x] Cron job for auto-renewal (Feb 10, 2026)
- [ ] Email notifications
- [ ] Alert system
- [ ] Testing & security audit

#### Auto-Renewal Implementation Details

**Cron Endpoint:** `POST /api/v1/cron/subscription-renewal`

**Files Created:**
- `services/subscription-renewal-service.ts` - Core renewal logic
- `app/api/v1/cron/subscription-renewal/route.ts` - Cron endpoint

**Features:**
- Daily check for subscriptions expiring within 3 days
- Automatic wallet deduction and renewal if balance sufficient
- Reminder emails when balance insufficient (TODO: integrate email service)
- Automatic downgrade to Free tier when subscription expires without balance
- Full logging to `system_logs` table

**Testing:**
```bash
curl -X POST http://localhost:3004/api/v1/cron/subscription-renewal \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 8. Security Checklist

- [x] Gateway webhook signature verification (both Xendit & DOKU)
- [x] API keys encrypted at rest (masked in API responses)
- [x] Database transactions with row locking
- [x] Immutable transaction log (wallet_transactions)
- [x] No manual balance modification (admin read-only)
- [x] All actions logged with IP, timestamp (system_logs)
- [ ] Admin 2FA required
- [ ] Rate limiting on payment endpoints
- [x] HTTPS only (in production)
- [x] Sensitive data encrypted at rest
- [x] Gateway failover logging

---

## 9. Compliance Notes

- ✅ **Tidak menyimpan data kartu** - Semua via Payment Gateway
- ✅ **Audit trail lengkap** - Semua transaksi ter-log
- ✅ **Refund transparan** - Via Gateway API, ter-log
- ✅ **Terms of Service** - User harus setuju sebelum top-up
- ✅ **No manual balance** - Mencegah fraud internal
- ✅ **Multi-gateway flexibility** - Tidak terkunci ke satu vendor

---

## 10. Summary Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   USER FLOW                           ADMIN FLOW                │
│   ─────────                           ──────────                │
│                                                                 │
│   ┌──────────┐                       ┌──────────────────┐      │
│   │ Top-up   │                       │ Orders (ro)      │      │
│   │ Balance  │───────┐               │ Wallets (ro)     │      │
│   └──────────┘       │               │ Logs             │      │
│        │             │               │ Gateway Config   │◄─┐   │
│        ▼             │               └──────────────────┘  │   │
│   ┌──────────────────────────────┐              │          │   │
│   │     Gateway Abstraction      │◄─────────────┘          │   │
│   │     Layer                    │                         │   │
│   └──────────┬───────────────────┘                         │   │
│              │                                              │   │
│       ┌──────┴──────┐                                      │   │
│       ▼             ▼                                      │   │
│   ┌────────┐   ┌────────┐                                  │   │
│   │ Xendit │   │  DOKU  │ ◄─ Admin can toggle ─────────────┘   │
│   │  API   │   │  API   │                                      │
│   └───┬────┘   └───┬────┘                                      │
│       │            │                                            │
│       └─────┬──────┘                                            │
│             ▼ (webhook)                                         │
│   ┌──────────────────────────────────────────┐                 │
│   │             wallet_transactions           │                 │
│   │          (immutable audit log)            │                 │
│   └──────────────────────────────────────────┘                 │
│        │                                                        │
│        ▼                                                        │
│   ┌──────────┐     ┌──────────────┐                            │
│   │  Wallet  │────►│ Subscription │                            │
│   │ Balance  │     │  (auto-pay)  │                            │
│   └──────────┘     └──────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
