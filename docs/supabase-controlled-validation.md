# AI RESUME APP — controlled database and Auth validation handoff

Target project: **AI RESUME APP**, ref `guvywdjhgsnufjwsrurq`.
This handoff is not evidence that remote deployment/validation occurred.
Only database migration application, Auth settings, and one controlled real account
flow are in scope. Do not deploy any Edge Function, enable checkout, connect a
Paddle catalog, create a Paddle destination, or perform a payment.

## 1. Preflight in the connected Supabase session

Confirm the project ref before every operation. Inspect current schema and migration
history first; do not assume the earlier zero-table observation is still current.
Run this read-only query in the SQL Editor:

```sql
select table_name from information_schema.tables
where table_schema='public' and table_name in
 ('profiles','paddle_customers','billing_checkouts','billing_subscriptions','paddle_webhook_events');
select p.proname from pg_proc p where p.pronamespace='public'::regnamespace
 and p.proname in ('create_account_profile','prevent_billing_owner_change');
select tgname from pg_trigger where tgrelid='auth.users'::regclass
 and tgname='on_auth_user_created_profile';
```

Expected: no rows before initial application. If any object already exists, stop
and compare its complete definition, grants and data against the prepared files.
Skip only a migration verified already applied; do not drop/overwrite objects.
If migration 001 exists but 002 does not, verify 001 then apply only 002.
Resolve drift with a separately reviewed additive migration rather than rerunning
CREATE statements or using a destructive reset.

## 2. Exact migration order

Apply the full contents of these files, one at a time, in the target project's
SQL Editor (or through the connected session's supported database-migration tool):

1. `supabase/migrations/202610120001_paddle_webhook_inbox.sql`
2. `supabase/migrations/202610120002_account_billing_foundation.sql`

Each contains BEGIN/COMMIT. Confirm success before proceeding to the next.
Migration 002 depends on the event inbox from 001. If an execution errors, ensure
ROLLBACK has completed and diagnose before retrying. Record which migrations
succeeded; direct SQL application may require migration-history reconciliation
before using CLI migration automation later.

Creating the inbox table does NOT deploy or activate the webhook. Do not execute
anything from `supabase/functions`, run `supabase functions deploy`, or alter JWT
verification settings for a deployed function. No webhook or billing secrets are
needed for this database/Auth-only validation. Do not run `supabase db reset`.

## 3. Structural audit

Run the complete read-only `supabase/validation/schema-audit.sql` file.
Compare returned columns/constraints to the exact migration definitions.
Required results:

| Check | Expected |
|---|---|
| Tables | Exactly the five named application tables |
| RLS | Enabled on all five |
| Policies | Only profiles_read_own, profiles_update_own, subscriptions_read_own |
| Anonymous grants | No SELECT, INSERT, UPDATE, DELETE on any of the five |
| Authenticated reads | SELECT only on profiles and billing_subscriptions |
| Authenticated writes | Only profiles.display_name UPDATE; no client INSERT/DELETE/billing writes |
| Server-only tables | paddle_customers, billing_checkouts, paddle_webhook_events |
| Service-role grants | SELECT/INSERT/UPDATE; no table DELETE grants |
| Environment constraints | sandbox/live values, environment-scoped uniqueness and composite FKs |
| History retention | Financial Auth-user FKs SET NULL; related customer/event FKs RESTRICT |
| Profile initialization | Auth signup trigger and existing-user backfill |
| Ownership protection | Triggers prohibit reassignment of environment/owner |

The SQL Editor normally uses a privileged database role, so a successful SELECT
there is not an RLS test. Use the role-switching test in step 6 and actual browser
requests in step 7. Privileged administrators remain able to change data.

## 4. Supabase Auth dashboard settings

In Authentication's provider/sign-in settings (dashboard labels may vary):

Inspect existing settings first and change only incorrect or missing settings.

- Enable email/password sign-in and allow new email signups.
- Enable email confirmation. Do not enable anonymous sign-in for this flow.
- Set minimum password length to at least 8; review existing stronger policies.
- Review Auth rate limits. Do not disable them to make testing pass.
- Under URL Configuration, set Site URL to
  `https://flip419.github.io/ai-money-machine/`.
- Add these exact Redirect URLs for this controlled test:
  - `https://flip419.github.io/ai-money-machine/`
  - `http://127.0.0.1:8000/`
- Use the exact trailing slash and root paths above. Do not use wildcard redirect
  entries. Do not browse `/index.html` when signing up unless its exact URL has
  separately been approved and allowlisted.
- Check the Confirm signup email template retains Supabase's
  `{{ .ConfirmationURL }}` link. A link pointing only to Site URL bypasses the
  intended confirmation callback. Do not replace the standard PKCE flow with an
  incompatible token-hash template without changing/reviewing the frontend.
- Verify email delivery is available. Built-in email sending may be restricted to
  project-team recipients and limited in rate; use an eligible team-owned test
  address or configure custom SMTP securely. Never paste SMTP credentials into
  this handoff, repository, browser, logs or chat.

The unmodified public GitHub Pages site does not yet have the new Auth UI. Its URL
is the intended production callback, not proof that the UI has been published.
Use the local root URL for this controlled real Auth test. No website deployment
is necessary and public deployment remains paused.

## 5. One real email/password account flow

Use a test mailbox you control. Do not create multiple users to work around errors.
From the local checkout, run:

```sh
npm ci --ignore-scripts
npm test
python3 -m http.server 8000 --bind 127.0.0.1 --directory .
```

Open `http://127.0.0.1:8000/` in the browser that will open the confirmation email.
Keep the server running while confirming. Do not place secret-valued `.env` files
or other credential files in the static server's served directory.

1. Confirm signed-out controls and disabled/preview checkout behavior.
2. Enter the controlled email and a unique password (at least eight characters).
   Submit Create account once. Expect the confirmation message, not paid access.
3. Before confirmation, ensure sign-in does not succeed. Check Auth Users shows one
   new user with confirmation pending. Do not record or share the password.
4. Open the emailed ConfirmationURL in the same browser/device; PKCE uses local
   verifier storage. Expect redirect to `http://127.0.0.1:8000/` and successful
   confirmation. Automatic sign-in after confirmation is valid.
5. Check Auth Users confirms the email. Copy only this test user's UUID for the
   validation SQL, not tokens/credentials. Verify its profile exists:

```sql
-- Replace only the non-secret account UUID below.
select id, display_name, created_at from public.profiles
where id = 'REPLACE_WITH_CONFIRMED_AUTH_USER_UUID'::uuid;
```

6. Sign out, sign in explicitly with email/password, and verify the account UI.
7. Reload and close/reopen a tab in the same browser profile. The session should
   persist. Verify sign-out on this device remains signed out after reload.
8. Sign in again to run step 7 below, then sign out when finished.

Keep one test account; do not delete it as cleanup or mutate auth.users directly.
Confirmation failures may indicate SMTP, redirect configuration, a template
mismatch, a reused/expired link, or a different PKCE browser context. Diagnose
instead of disabling email confirmation. Never screenshot network bodies,
password fields, Authorization headers or localStorage session values.

## 6. Executable RLS behavior validation (rollback-only)

Replace the single `REPLACE_WITH_CONFIRMED_AUTH_USER_UUID` placeholder in
`supabase/validation/account-billing-rls.sql` with the test user's UUID. Run the
**entire file in one SQL Editor execution**, not selected fragments.

It creates synthetic canceled sandbox records inside one transaction, switches
roles/claims to test anon, owner, and another simulated identity, then ROLLBACKs
all fixtures and temporary profile updates. It does not call Paddle or grant any
paid entitlement. Run before this user has any real Paddle customer mapping; if
uniqueness conflicts appear, stop and inspect, never delete/recreate a mapping.

Expected: no exceptions and a PASS result. The script proves:

- All five tables deny anonymous reads/inserts/updates/deletes.
- Owner can read their profile and a synthetic subscription and update display name.
- A different simulated identity cannot see those rows or update that profile.
- Authenticated clients cannot read server-only tables or insert/update/delete
  any billing/customer mapping/event rows.
- Protected profile fields cannot be updated.

If an assertion fails, run ROLLBACK separately if needed, record the failed check,
and stop. Do not COMMIT fixtures. After success, verify no fixtures remain:

```sql
select count(*) as validation_fixture_count from public.paddle_webhook_events
where payload->>'validation_only' = 'true';
```

Expected zero for this first validation. Also verify the test user's display name
matches its value before the test. The simulated foreign identity validates RLS
without creating a second real account; it is not an end-to-end second-user login.
Financial retention and environment boundary semantics were covered locally by
PostgreSQL tests; do not delete the real account merely to repeat those tests.

## 7. Real PostgREST checks from the signed-in local browser

Run this in DevTools Console on the local page. It uses only the existing public
key and session internally; it prints PASS labels only, never token values or
record contents. Do not expand/log the client, session or request objects.

```js
await (async () => {
  const { authConfig } = await import('/auth-config.mjs');
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm');
  const client = createClient(authConfig.url, authConfig.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: false,
      detectSessionInUrl: false, flowType: 'pkce', storageKey: 'ai-resume-studio-auth' }
  });
  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) throw Error('Sign in before validation');
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) throw Error('Verified Auth identity unavailable');
    const headers = { apikey: authConfig.publishableKey };
    const signed = { ...headers, Authorization: `Bearer ${session.access_token}` };
    const tables = ['profiles','paddle_customers','billing_checkouts','billing_subscriptions','paddle_webhook_events'];
    for (const table of tables) {
      const response = await fetch(`${authConfig.url}/rest/v1/${table}?select=*&limit=1`, { headers });
      if (![401,403].includes(response.status)) throw Error(`Anonymous denial failed: ${table}`);
    }
    for (const [table, ownerColumn] of [['profiles','id'],['billing_subscriptions','user_id']]) {
      const response = await fetch(`${authConfig.url}/rest/v1/${table}?select=${ownerColumn}`, { headers: signed });
      if (!response.ok) throw Error(`Permitted read failed: ${table}`);
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.some(row => row[ownerColumn] !== user.id)) throw Error(`Ownership leak: ${table}`);
      if (table === 'profiles' && rows.length !== 1) throw Error('Own profile missing');
      // No Paddle integration exists: an empty real subscription result is expected.
    }
    for (const table of ['paddle_customers','billing_checkouts','paddle_webhook_events']) {
      const response = await fetch(`${authConfig.url}/rest/v1/${table}?select=*&limit=1`, { headers: signed });
      if (![401,403].includes(response.status)) throw Error(`Server-only read exposed: ${table}`);
    }
    console.info('PASS: real Auth identity, anonymous denial and permitted own-row reads');
  } finally { client.auth.stopAutoRefresh(); }
})();
```

This is read-only. Client write denial is tested transactionally in step 6 rather
than sending writes that could persist if protections were unexpectedly broken.
Do not use a service-role key for these requests: that would bypass the protections
being tested. Distinguish authorization denials from unrelated network/CORS errors.

## 8. Browser credential exposure inspection

Inspect only public assets, network destination/header **names**, and storage
structure; do not print secret values or export HAR/session dumps.

- Frontend configuration may contain the Supabase URL and `sb_publishable_` key.
  The publishable key is public and does not bypass RLS.
- Browser Supabase requests may contain the user's access/refresh tokens. These
  are expected sensitive session credentials; never share them. They are not
  service-role or billing secrets.
- No frontend asset, request, source map, localStorage field, or generated build
  configuration may contain a Supabase service-role key, `sb_secret_` key, Paddle
  API key, or webhook signing secret.
- Auth requests send a password only to the expected Supabase HTTPS Auth endpoint.
  No passwords should appear in URLs, logs, UI messages or analytics.
- No Paddle requests/SDK initialization/checkout activation should occur.
- The new frontend dependency is pinned to Supabase JS 2.49.8. Verify it loads
  successfully, with no browser exceptions; the local automated browser tests
  used mocks and do not establish production Auth/CDN behavior.
- No service-role/billing secrets are required for this increment. Verify the
  Supabase management session keeps any existing secrets server-side.

If inspecting an actual generated deployment later, scan the exact emitted assets
as well as source. Do not publish the local server root or credential-bearing files.

## 9. Record results and stop before sandbox checkout

Report migration outcomes, five-table audit, RLS PASS/fail, HTTP denial/read checks,
Auth settings, confirmation/signup/sign-in/restoration/sign-out outcomes, and the
credential-exposure review. Keep failures, unrun steps and successful checks distinct.

Remaining gates before sandbox checkout work:

- Successful remote migration/RLS/Auth validation, including email delivery.
- Connected Paddle Sandbox and Supabase management access for the next increment.
- Approved sandbox catalog mapping and authenticated checkout/customer endpoint.
- Verified-event fulfillment, retry/order reconciliation, and explicit grace/refund
  policy details. Monthly prices remain Starter $9.99, Pro $19.99, Premium $39.99;
  no one-time purchases or credit rollover.
- Separate authorization for any sandbox webhook deployment or checkout enablement.

No webhook deploy/activation, public site deployment, live catalog connection, live
payment or unrestricted Internet access is part of this handoff.
