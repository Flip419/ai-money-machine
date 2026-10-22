# AI RESUME APP — AI Resume Studio

AI Resume Studio is a resume-building web app with live AI analysis, authenticated premium features, and Stripe subscription billing.

## Current capabilities
- Upload PDF, DOCX, or TXT resumes in the browser and extract readable text client-side
- Build a resume outline from scratch
- Compare a resume against a target job description
- Live AI resume analysis through Supabase Edge Functions
- ATS, keyword-match, and impact scoring
- Email/password account authentication with Supabase Auth
- Paid-plan entitlement checks
- Premium ATS-focused resume rewriting
- Starter-plan rewrite quota enforcement per Stripe billing period
- Pro entitlement handling
- Tailored cover-letter generation for Pro
- Stripe-hosted subscription checkout
- Stripe webhook processing and billing data mapping
- Stripe Customer Portal for invoices, payment methods, plan changes, cancellation, and reinstatement

## Architecture
- Frontend: static HTML/CSS/JavaScript deployed with GitHub Pages
- Backend: Supabase Postgres, Auth, Row Level Security, RPCs, and Edge Functions
- AI: OpenAI API calls from Supabase Edge Functions
- Billing: Stripe Billing + Checkout + Customer Portal

Resume files are parsed in the browser; the app sends extracted resume text and related target-job inputs to Supabase AI functions when the user requests analysis or generation.

## Billing status
Stripe test-mode end-to-end billing has been validated for:
- Starter subscription checkout
- Stripe webhook delivery into Supabase
- paid entitlement activation
- one-rewrite-per-billing-period Starter quota
- scheduled cancellation and reinstatement
- Starter-to-Pro upgrade with proration
- Pro cover-letter access
- Stripe Customer Portal management

Live payment processing is not enabled yet. The production switch requires live Stripe credentials, live prices, and a live webhook endpoint/secret before accepting real customer payments.

## Security and usage controls
- Paid AI features require an authenticated user and active entitlement.
- Starter users receive one full resume rewrite per Stripe billing period.
- Starter rewrite quota is checked before the paid AI request and claimed only after a successful rewrite.
- Pro is not subject to the Starter rewrite limit and includes cover-letter generation.
- Supabase RLS protects user-owned billing and entitlement data.
- Stripe webhook event tables are service-role only and are not exposed to signed-in users.
- Supabase leaked-password protection should be enabled in Auth settings before or shortly after production launch when available for the project.

## Production launch checklist
1. Complete final frontend and security QA.
2. Connect/activate the live Stripe account.
3. Create or verify live Starter and Pro recurring prices.
4. Replace Supabase Stripe test secrets and price environment values with live values.
5. Create the live Stripe webhook endpoint and store its signing secret in Supabase.
6. Verify the live Customer Portal configuration.
7. Run a controlled real-payment smoke test.
8. Monitor the first production webhook and entitlement updates before broad launch.

Legacy Paddle functions/tables remain temporarily for rollback protection and should only be removed after the Stripe production flow has been proven live.