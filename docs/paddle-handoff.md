# Paddle implementation handoff

## Observed setup and current limits

The user confirms project **AI RESUME APP**, ref `guvywdjhgsnufjwsrurq`, is
ACTIVE_HEALTHY and has only `analyze-resume` deployed. Repository code calls that
function. No database schema, user authentication, Paddle customer mapping,
payment functions, or secret metadata was accessible in this session.
The implementation here has not been deployed. Checkout buttons remain previews.

## New Edge Function: paddle-webhook

Complete source: `supabase/functions/paddle-webhook/index.ts` and `signature.mjs`.
Complete proposed migration: `supabase/migrations/202610120001_paddle_webhook_inbox.sql`.
Function configuration: `supabase/config.toml`. Merge its function stanza into any
existing Supabase configuration; do not overwrite unrelated settings.

After deploying this exact function to the confirmed project, the intended URL is:

`https://guvywdjhgsnufjwsrurq.supabase.co/functions/v1/paddle-webhook`

This is a deployment target, **not an existing or validated endpoint**. Report its
deployment and successful checks before entering it in Paddle Live. Never use the
existing `analyze-resume` URL for payment notifications.

### Required server-side variable names

- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_ENVIRONMENT`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Supabase supplies the last two in Edge Functions; check availability without
printing values. Securely set the first two using Supabase secret management.
Use `sandbox` during testing, then `live` only for the live destination's secret.
An API key is not needed to verify or store webhook events. Future API operations
require `PADDLE_API_KEY`, server-side only. No credentials belong in GitHub Pages,
frontend assets, source control, logs, or chat.

One function deployment accepts one signing secret/environment. To run sandbox
and live concurrently, deploy the same implementation to a separate staging
project for sandbox, retaining this project endpoint for live. Do not switch the
secret underneath an existing live destination or modify sandbox account entities.

### Deployment instructions for the connected session

1. Inspect existing tables, functions, RLS, and secret **names/presence** first.
   If `paddle_webhook_events` already exists, compare its schema and preserve its
   data; do not blindly apply this migration or delete/recreate anything.
2. Apply the SQL migration to this project after confirming the table is missing.
   The table contains potentially personal billing data. RLS denies browser
   clients; only server service-role access is granted. Establish retention and
   restricted operational access before production.
3. Configure secrets securely in Supabase. Do not pass literal secret values in
   shared command transcripts. Link the confirmed project if using the CLI.
4. Deploy with `supabase functions deploy paddle-webhook --project-ref
   guvywdjhgsnufjwsrurq --no-verify-jwt` (one shell command). Disabling JWT verification
   here is necessary because Paddle sends no Supabase user JWT; signature
   verification remains mandatory in the handler.
5. Verify unsigned POST returns 401 when configured; GET returns 405. A signed
   sandbox test must insert an event, a repeat delivery must keep one row, and a
   persistence failure must yield a retryable non-2xx response. Also validate the
   SQL constraints/RLS in the deployed project; the local tests mock persistence.
6. Audit Paddle Live destinations. Reuse any existing destination and its securely
   stored signing secret; never rotate/delete/recreate it. If no destination
   exists, create one only after the endpoint has been validated and securely
   store the returned secret. Do not print it. If an existing secret is unavailable,
   stop for secure recovery rather than recreating the destination.

### Event subscriptions

Subscribe to `transaction.completed`, `transaction.payment_failed`,
`subscription.created`, `subscription.activated`, `subscription.updated`,
`subscription.past_due`, `subscription.paused`, `subscription.resumed`,
`subscription.canceled`, `adjustment.created`, and `adjustment.updated`.

The handler authenticates and durably records these events; it does **not** grant
entitlements or update existing customer/subscription records. Duplicates are
ignored using `(environment, event_id)`. Out-of-order events are retained unchanged.
`processed_at` stays null until a future fulfillment worker completes processing.

## Required fulfillment design before any paid release

Inspect the real database in the connected session before proposing additional
table changes. The only table proposed now is the server-only event inbox above.
Do not change existing billing mirrors or customer/subscription data blindly.

The missing authenticated account system and existing schema prevent a safe,
complete entitlement migration here. Implement a server-side checkout endpoint
that verifies a Supabase access token and binds an authenticated user to a Paddle
customer/transaction. Never trust a browser-supplied email, internal user ID,
`custom_data`, or checkout-success callback as proof of ownership or payment.
Use a server-authored correlation mapping and an allowlist of configured price IDs.

A fulfillment worker must process verified inbox events transactionally and
idempotently. Grant only for `transaction.completed` with approved catalog IDs,
correct account mapping, currency and billing terms. Track fulfillment per
transaction to avoid duplicate credits; track subscription lifecycle separately.
Use event occurrence times and current Paddle API state to reconcile out-of-order
updates, never let older events overwrite newer subscription status. Handle
approved refunds/adjustments, cancellations at their effective time, and explicit
past-due/grace-period policy. Mark processed only after successful commit and
provide retry/reconciliation monitoring. Plan quantities, limits, refund behavior,
and user identity mapping require the actual schema and business rules.

## Frontend checkout design (not enabled by this change)

Files to change after the gates below pass:

- `index.html`: add Paddle.js v2 (`https://cdn.paddle.com/paddle/v2/paddle.js`) and
  a generated public config script before `app.js`; add accessible policy/contact
  links. Confirm the three displayed monthly prices match the live catalog.
- `app.js`: replace the `.buy` preview listener with an authenticated checkout
  flow; initialize Paddle using only the public client-side token. For sandbox,
  explicitly select sandbox; for live omit `Paddle.Environment.set('sandbox')`.
  Open checkout with the transaction ID returned by the authenticated server-side
  checkout endpoint, rather than trusting price/user IDs supplied by the browser.
  Fetch the signed-in user's Paddle customer ID through an authenticated backend
  mapping and pass `pwCustomer: { id: paddleCustomerId }` during initialization.
  Never substitute an email or Supabase/internal user ID. Reinitialize appropriately
  when the signed-in account changes. A checkout-completed callback only refreshes
  backend-confirmed entitlement status; it cannot grant access.
- New public build config: generate client token, feature flag, and mapped catalog
  IDs from build-time environment variables. GitHub Pages cannot read `.env` at
  runtime. Only explicitly allowlisted public values may be generated; never
  serialize all environment variables. `.env.example` lists placeholders.

Live is disabled by default. Do not enable until sandbox tests pass, the catalog
mapping and fulfillment work, Paddle verification passes, and domains are approved.
Local/staging live initialization must not become customer-facing inadvertently.

## IP filtering and account configuration still outstanding

Fetch live CIDRs from `https://api.paddle.com/ips`, field `data.ipv4_cidrs`, with
TLS verification. Enforce the refreshed list at a gateway with a trustworthy source
IP, rejecting all others. Do not trust arbitrary `X-Forwarded-For` headers in an
Edge Function or treat signature verification as completing this requested IP rule.
Supabase's available ingress/source-IP guarantees must be checked in the connected
session. If a controlled gateway is needed, expose its verified URL to Paddle and
prevent bypass to the function. The final Paddle URL would then be that gateway,
which cannot be specified before its deployment. No IP filter is implemented here.

Paddle connections are still needed for catalog/destination audit and migration.
Desired methods: cards, Apple Pay, Google Pay, PayPal where supported. Set the
default payment link manually in Checkout > Checkout configuration to the approved
live checkout page. Submit the website under My account > Settings > Website
approval and configure payouts under Business account > Payouts > Payout settings.
Check current Paddle guidance before claiming these account steps are complete.

Public site: `https://flip419.github.io/ai-money-machine/`. Candidate policy URLs
are `terms.html`, `privacy.html`, and `refund.html` beneath that path, but public
access was not validated. Add a real support contact, homepage policy links, and
clear cancellation instructions. Exact verification requirements remain unverified.

## Local validation

Run `node --test tests/paddle-webhook.test.mjs` from the checkout (Node 24).
Tests exercise raw-byte signatures and the handler with mocked REST persistence.
They do not establish Deno deployment, PostgreSQL migration success, sandbox
integration success, Paddle IP filtering, or account readiness.
