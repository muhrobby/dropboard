# 🚀 Quick Setup Guide - Admin System & RBAC

## ⚡ 5-Minute Setup

### 1. Set Environment Variables

Add to `.env.local`:

```bash
# Admin User (required)
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_NAME="Admin User"
```

### 2. Run Database Migration

```bash
pnpm db:push
```

This will add the `role` field to your users table.

### 3. Seed Database

```bash
pnpm db:seed
```

This creates:
- ✅ Pricing tiers (Free, Pro, Business)
- ✅ Payment gateway configs
- ✅ Admin user account

### 4. Verify Admin User

Check your database:

```sql
SELECT email, role FROM "user" WHERE role = 'super_admin';
```

You should see your admin email with `super_admin` role.

### 5. Start the App

```bash
pnpm dev
```

### 6. Access Admin Portal

1. Login with your admin account
2. Navigate to: `http://localhost:3004/admin`
3. You should see the admin dashboard 🎉

---

## 🔐 Manual Role Assignment (Optional)

If you need to promote an existing user to admin:

```sql
-- Make user a super admin
UPDATE "user" 
SET role = 'super_admin' 
WHERE email = 'youremail@example.com';

-- Make user a regular admin
UPDATE "user" 
SET role = 'admin' 
WHERE email = 'youremail@example.com';
```

---

## 📋 Available Admin Routes

| Route | Description | Required Role |
|-------|-------------|---------------|
| `/admin` | Dashboard overview | admin |
| `/admin/orders` | View all orders | admin |
| `/admin/wallets` | Monitor wallets (read-only) | admin |
| `/admin/users` | User management | admin |
| `/admin/gateways` | Payment gateway config | super_admin |
| `/admin/logs` | System logs | admin |

---

## 🧪 Test Your Setup

### Check RBAC is Working

1. Try to access `/admin` **without** being logged in
   - Expected: Redirect to dashboard with "Access Denied"

2. Login as regular user (role = 'user')
   - Expected: Cannot access `/admin`

3. Login as admin (role = 'admin' or 'super_admin')
   - Expected: Can access admin portal ✅

### Check API Protection

```bash
# Without admin role - should return 403
curl http://localhost:3004/api/v1/admin/orders

# With admin role - should return data
# (Need to include auth cookies)
```

---

## ⚠️ Troubleshooting

### "Access Denied" even though I'm admin

1. Check your role in database:
```sql
SELECT email, role FROM "user" WHERE email = 'youremail@example.com';
```

2. If role is wrong, update it:
```sql
UPDATE "user" SET role = 'super_admin' WHERE email = 'youremail@example.com';
```

3. Clear browser cache and re-login

### Migration failed

```bash
# Force push (⚠️ will reset database)
pnpm db:push --force

# Re-run seeds
pnpm db:seed
```

### Admin user not created

1. Check `.env.local` has `ADMIN_EMAIL`
2. Run seed again: `pnpm db:seed`
3. It will update existing user's role if user already exists

---

## 📚 Full Documentation

- **Deployment Guide**: `docs/DEPLOYMENT_GUIDE.md`
- **Implementation Summary**: `docs/IMPLEMENTATION_SUMMARY.md`
- **Admin System Plan**: `docs/ADMIN_SYSTEM_PLAN.md`

---

## 🎯 Next Steps

1. ✅ Setup complete!
2. Configure payment gateways at `/admin/gateways`
3. Review user list at `/admin/users`
4. Monitor system logs at `/admin/logs`
5. Ready to go live! 🚀

---

**Setup Date:** Feb 10, 2026  
**Estimated Time:** 5 minutes  
**Difficulty:** Easy ⭐
