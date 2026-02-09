# 🚀 Dropboard Admin System - Deployment Guide

## Prerequisites

- Node.js 18+ (LTS)
- PostgreSQL database
- pnpm package manager

## 1. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dropboard"

# Payment Gateways
XENDIT_SECRET_KEY="xnd_development_xxxxx"
XENDIT_PUBLIC_KEY="xnd_public_development_xxxxx"
XENDIT_CALLBACK_TOKEN="your-xendit-callback-token"

DOKU_CLIENT_ID="your-doku-client-id"
DOKU_SECRET_KEY="your-doku-secret-key"
DOKU_NOTIFICATION_TOKEN="your-doku-notification-token"

# App URL (for webhooks)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Admin User (for seeding)
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_NAME="Admin User"

# Auth Configuration
# Add your auth provider credentials here
```

## 2. Database Setup

### Install Dependencies

```bash
pnpm install
```

### Run Migrations

```bash
# Push schema to database
pnpm db:push

# Or generate and run migrations manually
pnpm db:generate
pnpm db:migrate
```

### Seed Database

This will create:
- Default pricing tiers (Free, Pro, Business)
- Payment gateway configurations
- Admin user account

```bash
pnpm db:seed
```

**Important:** After seeding, you need to set up authentication for the admin user through your auth provider (e.g., Better Auth, NextAuth, etc.).

## 3. Verify Installation

### Check Database Tables

Connect to your PostgreSQL database and verify these tables exist:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

You should see:
- `user` (with `role` column)
- `wallet`
- `wallet_transaction`
- `topup_order`
- `pricing_tier`
- `payment_gateway_config`
- `subscription`
- `system_log`
- ...and other existing tables

### Check Admin User

```sql
SELECT id, name, email, role FROM "user" WHERE role IN ('admin', 'super_admin');
```

## 4. Admin Access Setup

### Creating Admin Users

**Option A: Via Database (Quick)**

```sql
UPDATE "user" 
SET role = 'super_admin' 
WHERE email = 'youremail@example.com';
```

**Option B: Via Seed Script**

Set in `.env.local`:
```bash
ADMIN_EMAIL="youremail@example.com"
ADMIN_NAME="Your Name"
```

Then run:
```bash
pnpm db:seed
```

### Role Levels

| Role | Access Level | Description |
|------|-------------|-------------|
| `user` | Product Dashboard only | Regular users |
| `admin` | Read-only monitoring | Customer support, finance team |
| `super_admin` | Full admin control | CTO, Tech Lead, System administrators |

## 5. Payment Gateway Configuration

### Initial Setup

1. Login as super_admin
2. Navigate to `/admin/gateways`
3. Configure API keys for Xendit and/or DOKU
4. Set one gateway as primary
5. Test the connection

### Xendit Configuration

```json
{
  "secretKey": "xnd_development_xxxxx",
  "publicKey": "xnd_public_development_xxxxx", 
  "callbackToken": "your-callback-token"
}
```

### DOKU Configuration

```json
{
  "clientId": "your-client-id",
  "secretKey": "your-secret-key"
}
```

## 6. Webhook Setup

### Xendit Webhooks

Configure in Xendit Dashboard:

| Event | Webhook URL |
|-------|------------|
| Invoice Paid | `https://yourdomain.com/api/webhooks/xendit/invoice` |
| Refund | `https://yourdomain.com/api/webhooks/xendit/refund` |

### DOKU Webhooks

Configure in DOKU Dashboard:

| Event | Webhook URL |
|-------|------------|
| Payment Notification | `https://yourdomain.com/api/webhooks/doku/notification` |
| Refund | `https://yourdomain.com/api/webhooks/doku/refund` |

## 7. Running the Application

### Development

```bash
pnpm dev
```

Access:
- User Dashboard: http://localhost:3000/dashboard
- Admin Portal: http://localhost:3000/admin

### Production

```bash
pnpm build
pnpm start
```

## 8. Security Checklist

Before going to production:

- [ ] All API keys in environment variables (not hardcoded)
- [ ] Database credentials secured
- [ ] Webhook signature verification enabled
- [ ] HTTPS enabled for all endpoints
- [ ] Rate limiting configured
- [ ] Admin user 2FA enabled (if available)
- [ ] Audit logs monitoring set up
- [ ] Backup strategy in place

## 9. Troubleshooting

### Migration Issues

```bash
# Reset database (⚠️ DESTRUCTIVE)
pnpm db:push --force

# Re-run seeds
pnpm db:seed
```

### Admin Access Denied

1. Check user role in database:
```sql
SELECT email, role FROM "user" WHERE email = 'youremail@example.com';
```

2. Update role if needed:
```sql
UPDATE "user" SET role = 'super_admin' WHERE email = 'youremail@example.com';
```

3. Clear browser cache and re-login

### Payment Gateway Issues

1. Check gateway configuration in admin panel
2. Verify API keys are correct
3. Check webhook logs in `/admin/logs`
4. Test connection using "Test Connection" button

## 10. Monitoring

### System Logs

Access at `/admin/logs` to monitor:
- Payment events
- Subscription activities
- Auth events
- System errors

### Database Health

```sql
-- Check wallet balance integrity
SELECT 
  w.user_id,
  w.balance,
  COALESCE(SUM(wt.amount), 0) as calculated_balance
FROM wallet w
LEFT JOIN wallet_transaction wt ON w.id = wt.wallet_id
GROUP BY w.id, w.user_id, w.balance
HAVING w.balance != COALESCE(SUM(wt.amount), 0);
```

Should return 0 rows (balance matches transactions).

## 11. Backup & Recovery

### Database Backup

```bash
pg_dump -h localhost -U username dropboard > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
psql -h localhost -U username dropboard < backup_20260210.sql
```

---

## Support

For issues or questions:
1. Check logs at `/admin/logs`
2. Review ADMIN_SYSTEM_PLAN.md
3. Contact tech team

---

**Last Updated:** Feb 10, 2026
