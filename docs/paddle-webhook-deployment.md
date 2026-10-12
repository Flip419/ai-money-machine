# Prepared Paddle webhook — connected-session handoff

Project: AI RESUME APP, ref `guvywdjhgsnufjwsrurq`.
The user confirms both schema migrations have been applied remotely, with all five
application tables, RLS, intended policies and ownership guards verified.
This repository preparation does not deploy or activate anything.

## Exact deployment files

- `supabase/functions/paddle-webhook/index.ts`
- `supabase/functions/paddle-webhook/signature.mjs`
- `supabase/config.toml` — merge the function stanza into existing config, not over
  unrelated project configuration.

The committed migrations are schema reference snapshots only; **do not reapply**
them to the already migrated project. No additional migration is required by this
handler. The webhook test is self-contained: `node --test tests/paddle-webhook.test.mjs`
with Node 24; no npm dependencies are needed for that test. Type check with Deno 2:
`deno check supabase/functions/paddle-webhook/index.ts`.

## Schema contract

The only database operation is an INSERT into `public.paddle_webhook_events`:
`environment`, `event_id`, `event_type`, `occurred_at`, `payload`.
`received_at` uses the database default; `processed_at` remains null.
Duplicates use the deployed primary key `(environment, event_id)` via PostgREST
`on_conflict=environment,event_id` and `resolution=ignore-duplicates`.
Existing event payloads are never replaced. No writes occur to profiles, customer
mappings, checkouts, subscriptions or auth.users. No paid entitlement is granted.

## Required server-side variable names

Configure/check names and presence without printing values:

- `PADDLE_WEBHOOK_SECRET` — signing secret for the destination whose deliveries this
  deployment will receive. Store only in Supabase secrets. Reuse an existing live
  destination's secret; do not rotate/delete/recreate the destination. If unavailable,
  stop for secure recovery.
- `PADDLE_ENVIRONMENT` — non-secret value `sandbox` or `live`, matching the secret.
- `SUPABASE_URL` — normally provided by Supabase Edge Functions.
- `SUPABASE_SERVICE_ROLE_KEY` — normally provided by Supabase Edge Functions;
  strictly server-side and never returned/logged or included in browser assets.

No `PADDLE_API_KEY` is required by this handler. Remote secret availability was not
inspected in this session; do not assume a binding is missing merely because it
is absent in the local machine. Never put real secret values in Git, chat or CLI
command transcripts. The code contains no client-side credentials or frontend
checkout initialization.

One deployment accepts one environment/secret. To retain concurrent sandbox/live
receivers, use separate reviewed deployments/projects; do not replace a live
secret underneath an existing destination. Setting environment alone does not
prove account origin: choosing the correct signing secret is essential.

## Authentication and responses

Paddle uses `Paddle-Signature`, not a Supabase user JWT. The prepared function config
sets `verify_jwt = false`; signature verification remains mandatory in code.
The handler verifies SHA-256 HMAC over the original `timestamp:body` bytes with a
five-minute timestamp tolerance and checks each valid `h1` signature. Original
bytes are retained without JSON reserialization. Streaming bodies are capped at
1 MiB. Inserts time out after three seconds and errors remain sanitized.

- 405: method is not POST (Allow: POST).
- 401: missing/invalid/expired signature.
- 400: signed malformed JSON or invalid event shape.
- 413: body exceeds the limit.
- 503: missing server configuration or unavailable persistence/processing.
- 200: recorded event, duplicate delivery, or authenticated unsupported event.

Supported events: transaction.completed, transaction.payment_failed,
subscription.created, subscription.activated, subscription.updated,
subscription.past_due, subscription.paused, subscription.resumed,
subscription.canceled, adjustment.created, adjustment.updated.
No subscription/credit fulfillment worker is implemented. Monitor the pending
inbox; a 200 response proves only ingestion, not access activation.

## Deployment and validation are for the connected session

Deployment is **not authorized to run in this task**. After separate authorization,
the connected session should confirm the exact Git commit, inspect remote secrets,
verify schema references, and deploy this function without enabling checkout.
The CLI equivalent for that authorized session is:

```sh
supabase functions deploy paddle-webhook --project-ref guvywdjhgsnufjwsrurq --no-verify-jwt
```

Do not execute that command while deployment is paused. No destination creation,
checkout activation or live charge is implied by this handoff.

Intended direct function URL after deployment:
`https://guvywdjhgsnufjwsrurq.supabase.co/functions/v1/paddle-webhook`
This is not yet a deployed/verified endpoint. After deployment, GET should return
405 and an unsigned POST should return 401 when secrets are configured (503 means
configuration is incomplete). Signed sandbox delivery should insert one row;
repeated delivery must retain one row, and a database failure must return non-2xx.
Confirm signatures/events using a safe sandbox receiver and authorization, not
live payments. Do not send a sandbox destination to a receiver holding a live secret.

## Remaining limitations

- Dynamic IP filtering is not implemented. Before claiming the earlier live
  allowlist requirement is satisfied, fetch `https://api.paddle.com/ips` and enforce
  it using a trusted ingress source IP. Do not trust caller-controlled forwarded
  headers. Supabase ingress guarantees require verification in the connected
  session; a controlled gateway may be required. A gateway would change the final
  URL entered in Paddle.
- No verified-event entitlement processing, subscription reconciliation or credit
  grants exist. Do not enable paid checkout based on this inbox alone.
- No real Supabase deployment or Paddle delivery was tested in this task. Local
  tests cover signature failure, schema insert fields, duplicates, malformed/large
  payloads, method handling, ignored events and retryable storage/config errors.
- Keep checkout disabled. All live payment activity remains paused.
