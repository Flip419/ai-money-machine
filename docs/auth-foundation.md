# Authentication and billing ownership increment

## Scope and deployment status

This increment adds email/password UI, session handling, unapplied SQL migrations,
and a reusable server authentication helper. No migration, Edge Function, website,
or checkout has been deployed. There are no checkout API calls or catalog bindings.
Checkout-preview buttons remain unchanged. Existing analysis lists now render as
text rather than HTML to prevent analysis output from injecting scripts into a
browser holding a persisted Auth session.
No real account or payment was created during local tests.

## Browser authentication

`auth-ui.mjs` uses pinned Supabase JS 2.49.8 through jsDelivr. `auth-config.mjs`
contains only the project's existing public URL and publishable key, not a secret.
Supabase manages persisted sessions, automatic token refresh and PKCE confirmation
callbacks. Sign-up explains confirmation, sign-in handles errors without exposing
server diagnostics, and sign-out clears this device's session. Passwords are cleared
from the form after submission. Signed-in email is rendered as text, never HTML.
A restored browser session is UI state only and cannot grant paid access.

Before any production website deployment, enable email/password auth and email
confirmation in Supabase, set a minimum password length of at least eight, review
rate limits, and configure production SMTP/delivery. Set Auth Site URL to
`https://flip419.github.io/ai-money-machine/` and add the exact allowed confirmation
redirect URL for that path plus explicitly chosen local/staging URLs. Use localhost
only for development redirect settings, never as Paddle's live payment link.
PKCE confirmation links should be opened in the browser used for sign-up.
Password reset and account deletion UI are outside this increment.

`supabase/functions/_shared/auth.ts` calls Supabase Auth `/auth/v1/user` with the
request's Bearer token. Future backend functions must pass trusted server
`SUPABASE_URL`/`SUPABASE_ANON_KEY` configuration and derive the ownership UUID from
its verified return value. Never use request body user IDs/emails or decoded-only
JWT claims. Anonymous Auth sessions are rejected. Function-specific authorization,
CORS and rate limiting still need to be implemented with each future endpoint.
This helper itself is not a deployed function.

## Migration order and security

1. `202610120001_paddle_webhook_inbox.sql` creates the server-only event inbox.
2. `202610120002_account_billing_foundation.sql` creates profiles and billing tables.

Do not apply either migration yet. In the connected session, inspect the latest
schema before an authorized migration application; these deliberately do not
silently overwrite existing tables. Applying the database migrations must not be
coupled to deploying the Paddle webhook.

- `profiles`: Auth UUID primary key; trigger creates a blank profile on sign-up and
  migration backfills existing accounts. Users can select their own row and update
  only `display_name`, not IDs or creation timestamps. Raw signup metadata does not
  establish billing ownership. Only this non-financial profile cascades on deletion.
- `paddle_customers`: unique per environment/account and environment/customer ID;
  server-only mapping access.
- `billing_checkouts`: server-only request idempotency keys, transaction IDs, plan
  and price references. Browser-selected arbitrary prices are not supported.
- `billing_subscriptions`: users can read their own rows, while writes remain
  server-only. Stores lifecycle, paid-through, grace and revocation fields for the
  future verified fulfillment worker. A paid-through value requires a source event
  reference. Having an `active` row alone is not proof of paid entitlement.
- `paddle_webhook_events`: unique environment/event ID and server-only payloads.

RLS is enabled on all five tables. Anonymous users have no table access. Customer
mappings/checkouts/inbox have no authenticated client grants or policies. Only
profile and subscription own-row SELECT policies exist; only display-name UPDATE
is allowed for profiles. No client INSERT/DELETE/billing UPDATE permission exists.
The server service role has SELECT/INSERT/UPDATE grants but no DELETE grants for
billing tables. Database owners/admins remain privileged; RLS is not a protection
against a leaked service key. No such key is used in the frontend.

Financial tables use `ON DELETE SET NULL` on the current Auth-user FK and retain a
stable `owner_reference` UUID for history. That UUID is never a fallback
authorization key: policies use only current `user_id`. Triggers prohibit changing
billing ownership or environment, and composite foreign keys prohibit linking a
live record to a sandbox customer or event. Closing an account preserves billing
rows/events; a new account must not adopt the old mapping by matching email.
Historical customer references cannot be deleted while related rows reference them.

No credit ledger is created yet: version one has monthly subscriptions, and no
credit quotas, usage accounting rules, purchases or rollover are approved. Add an
append-only server-controlled ledger only when actual credit-based features are
specified. There is no one-time purchase or rollover logic.

## Approved behavior reserved for future fulfillment

Starter $9.99/month, Pro $19.99/month, Studio Premium $39.99/month. The schema
allowlists these plan names but does not invent live Paddle IDs, currencies or
billing settings. Future server configuration will map verified catalog entries.

Cancellation should preserve access through the paid period unless a refund or
other authorized revocation applies. Failed payments should use a short grace
period; its precise duration remains undecided, and this increment does not grant
one automatically. Refund handling must reconcile the corresponding transaction
and entitlement; full/partial refund rules still require a concrete policy.
Only verified server-side webhook processing may write paid entitlement state.
Checkout callbacks remain unable to grant anything.

## Validation and reproducible local setup

Use Node 24, then `npm ci --ignore-scripts` and `npm test`. Browser tests use the
installed Chromium at `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installed
binary. No browser download is needed in this cloud machine. For local site startup,
run `python3 -m http.server 8000 --bind 127.0.0.1 --directory .` from the repository.

Tests include actual PostgreSQL semantics through PGlite for migrations, own-row
RLS, denied anonymous/client billing access, environment boundaries and preservation
on Auth account deletion. Auth controller/backend tests cover restoration races,
verified identity and error cases. Browser tests mock Supabase responses and CDN
modules, covering signup confirmation, sign-in/errors, reload persistence, sign-out,
and paused checkout. They do not contact production Auth or validate email delivery.

## Remaining gates before sandbox checkout

- Authorized application of the reviewed SQL and real-project RLS validation.
- Verify real email confirmation, sign-in, token refresh and profile creation in a
  controlled test account after authorization.
- Access to Paddle Sandbox and the connected Supabase management session.
- Authenticated server checkout/customer endpoint with plan allowlisting,
  idempotency, ownership checks and an approved sandbox catalog mapping.
- Fulfillment worker that applies verified events atomically, handles retries and
  ordering, and enforces concrete grace/refund/usage policies.
- Sandbox webhook deployment and end-to-end tests, only after separate authorization.

Live catalog setup, public checkout and live payments remain paused. No unrestricted
network access is requested or required for this increment.
