# DOKU Payment Integration Fixes

## Issues Identified
1. **Unknown Error**: The original error `DOKU error: Unknown error` was caused by the error handler masking the actual response from DOKU.
2. **Environment URL**: The implementation was hardcoded to `https://api.doku.com` (Production), but you are likely using Sandbox credentials.
3. **Signature Generation**: The signature generation logic was hardcoded for `/checkout/v1/payment` and missing `Request-Id`, which causes failures for other endpoints and newer DOKU API compliance.
4. **Missing Request-Id**: Use of `Request-Id` header is standard/required for DOKU V2/Checkout API but was missing.

## Fixes Applied (`lib/payment-gateway.ts`)

### 1. Dynamic Check for Environment
Added logic to switch between Sandbox and Production URLs:
```typescript
const isProduction = config.isProduction === true;
this.baseUrl = isProduction ? "https://api.doku.com" : "https://api-sandbox.doku.com";
```

### 2. Correct Signature Generation
Updated `generateSignature` to accept `targetPath` and `requestId`, matching DOKU's HMAC-SHA256 requirements:
```typescript
const signatureData = `Client-Id:${this.clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}\nDigest:${digest}`;
```

### 3. Debug Logging
Added detailed logging of DOKU error responses to the server console:
```typescript
console.error("DOKU Payment Error Details:", JSON.stringify(error, null, 2));
```

### 4. Import Fix
Fixed `ReferenceError: crypto is not defined` by adding proper import.

## verification
- If you still encounter errors, please check your server console (terminal where `pnpm dev` is running). The detailed error from DOKU will now be visible.
- Ensure your `DOKU_CLIENT_ID` and `DOKU_SECRET_KEY` in `.env.local` match your DOKU Sandbox Dashboard.
