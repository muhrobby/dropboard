# Testing DOKU Payment Gateway Locally

## Problem: DOKU doesn't accept localhost callback URLs

DOKU's API requires a **publicly accessible** callback URL. When using `localhost:3004`, DOKU will reject the payment request with an INTERNAL SERVER ERROR.

## Solution: Use ngrok (or similar tunneling service)

### Quick Setup with ngrok

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok

   # Windows
   # Download from: https://ngrok.com/download

   # Linux
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc
   echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
   sudo apt update && sudo apt install ngrok
   ```

2. **Sign up and authenticate:**
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

3. **Start the tunnel:**
   ```bash
   ngrok http 3004 --subdomain your-unique-name
   ```

   You'll get a URL like: `https://your-unique-name.ngrok-free.app`

4. **Update your `.env.local`:**
   ```bash
   # Change from localhost to ngrok URL
   NEXT_PUBLIC_APP_URL=https://your-unique-name.ngrok-free.app
   ```

5. **Restart your dev server:**
   ```bash
   pnpm dev
   ```

6. **Test the payment flow**

### Alternative: Use cloudflare

```bash
# Install cloudflare tunnel
brew install cloudflared

# Start tunnel
cloudflared tunnel --url http://localhost:3004
```

### DOKU Sandbox Credentials

Ensure you're using sandbox credentials:

| Environment | Client ID Format | Base URL |
|-------------|-----------------|----------|
| Sandbox | `BRN-0242-xxxxxxxxx` | `https://api-sandbox.doku.com` |
| Production | `BRN-xxxx-xxxxxxxxx` | `https://api.doku.com` |

### Verify Your Configuration

Check the admin panel at `/admin/gateways` to ensure:
- [ ] DOKU gateway is active
- [ ] Client ID is set (starts with `BRN-0242-` for sandbox)
- [ ] Secret Key is set
- [ ] isProduction is unchecked (for sandbox)

### Common DOKU Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `INTERNAL SERVER ERROR` | Localhost URL | Use ngrok/cloudflared |
| `INVALID_SIGNATURE` | Wrong secret key | Check your DOKU dashboard |
| `INVALID_CLIENT_ID` | Wrong client ID | Verify in DOKU dashboard |
| `Missing line_items` | API version mismatch | Updated in latest code |

### Testing Flow

1. User clicks "Top Up"
2. System creates DOKU payment
3. User redirected to DOKU payment page
4. User completes payment (in DOKU sandbox, use test credentials)
5. DOKU sends webhook to your ngrok URL
6. Your server processes the webhook
7. Wallet balance updated

### DOKU Sandbox Test Credentials

When redirected to DOKU payment page in sandbox mode, use:

**Virtual Account (BCA):**
- Any 10-digit number is accepted
- No actual payment needed

**E-Wallet (GoPay/OVO/DANA):**
- Use test phone numbers provided in DOKU dashboard

**QRIS:**
- Scan with any e-wallet app (sandbox)
