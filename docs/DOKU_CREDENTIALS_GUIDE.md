# DOKU Credentials Setup Guide

## Problem: 500 Internal Server Error

This error means your DOKU credentials are incorrect or your account isn't configured properly.

---

## Step 1: Get Correct Credentials from DOKU Dashboard

### 1. Login to DOKU Sandbox Dashboard
```
https://dashboard-sandbox.doku.com
```

### 2. Navigate to Credentials
- Go to **Credentials** → **Checkout API** (or **JOKUL Checkout**)

### 3. Find Your Credentials

You will see:

| Field | Where to find | Example format |
|-------|---------------|----------------|
| **Client ID** | Dashboard → Credentials | `BRN-0242-xxxxxxxxxxxxx` |
| **Shared Key / Secret Key** | Dashboard → Credentials | `SK-xxxxxxxxxxxxxxxxxxxx` |

---

## Step 2: Important Notes

### Client ID Format
- **Sandbox**: Starts with `BRN-0242-` or `MCH-0001-`
- **Production**: Starts with `BRN-xxxx-`

### Secret Key / Shared Key
- This is often called **"Shared Key"** in DOKU dashboard
- It's used for HMAC signature calculation
- Format: `SK-xxxxxxxxxxxxxxxxxxxx` (32+ characters)

### Common Mistakes

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| Using `Client Secret` instead of `Shared Key` | Use **Shared Key** for signature |
| Using Production keys in Sandbox | Match environment (sandbox → sandbox) |
| Using API Key instead of Shared Key | Use **Shared Key** from Checkout API section |

---

## Step 3: Enable Checkout API

1. In DOKU Dashboard, go to **Settings** or **Configuration**
2. Find **Checkout API** or **JOKUL Checkout**
3. Make sure it's **enabled/active**
4. Select payment methods you want to accept:
   - Virtual Account (BCA, Mandiri, BNI, BRI, etc.)
   - QRIS
   - E-Wallet (OVO, DANA, ShopeePay)

---

## Step 4: Update in Dropboard Admin

1. Go to `/admin/gateways`
2. Click **Configure** on DOKU
3. Enter your credentials:
   - **Client ID**: `BRN-0242-1770686917691` (your sandbox Client ID)
   - **Secret Key**: `SK-fVzcWMUWFwAzh2AkeMct` (your Shared Key)
4. Make sure **Production Mode** is **OFF** (unchecked)
5. Click **Save Changes**

---

## Step 5: Test Connection

1. In the Configure modal, click **Test Connection**
2. Expected result:
   ```
   ✅ Connection successful!
   Credentials are valid! (Request format error is expected for test)
   ```
3. If you see authentication error, your credentials are wrong

---

## Step 6: Check Your Current Database Config

Run this query to see what's currently stored:

```sql
SELECT provider, is_active, is_primary,
       JSON_EXTRACT_PATH_TEXT(config, 'clientId') as client_id,
       JSON_EXTRACT_PATH_TEXT(config, 'isProduction') as is_production
FROM payment_gateway_config
WHERE provider = 'doku';
```

---

## DOKU Dashboard Links

| Environment | Dashboard URL |
|-------------|---------------|
| Sandbox | https://dashboard-sandbox.doku.com |
| Production | https://dashboard.doku.com |

---

## Still Having Issues?

### Checklist:
- [ ] Client ID matches exactly (copy-paste from dashboard)
- [ ] Secret Key is the **Shared Key**, not Client Secret
- [ ] Production Mode is OFF for sandbox testing
- [ ] Checkout API is enabled in DOKU dashboard
- [ ] Your DOKU account is verified/active

### Contact DOKU Support:
- Email: support@doku.com
- Live chat available in dashboard

---

## Quick Fix

If you're still stuck, try this:

1. **Regenerate your Shared Key** in DOKU Dashboard
2. **Copy the new Shared Key** immediately
3. **Paste it into Dropboard admin panel**
4. **Save and test again**

Shared Keys can sometimes get out of sync or have copy-paste issues.
