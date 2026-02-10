# How to Configure Payment Gateways

## Option 1: Via Admin Portal (Recommended)
You can now configure payment gateways directly from the Admin Portal.

1.  Navigate to **/admin/gateways**.
2.  Find the **DOKU** gateway.
3.  Ensure the gateway is **Active** (toggle the switch if needed).
4.  Click the **Configure** button.
5.  Enter your credentials:
    -   **Client ID**: `your-doku-client-id` (from DOKU Dashboard)
    -   **Secret Key**: `your-doku-secret-key`
    -   **Production Mode**: Toggle OFF for Sandbox.
6.  Click **Save Changes**.

## Option 2: Via Environment Variables (Seed)
If you prefer to use `.env.local` values:

1.  Ensure `.env.local` has:
    ```
    DOKU_CLIENT_ID=...
    DOKU_SECRET_KEY=...
    ```
2.  Run the seed script:
    ```bash
    pnpm dlx dotenv-cli -e .env.local -- pnpm db:seed
    ```

## Verify Fix
After configuration:
1.  Go to **Wallet** -> **Top Up**.
2.  Attempt a top-up.
3.  If configured correctly, you should be redirected to the DOKU payment page (or receive a payment URL).
