# AI RESUME APP — AI Resume Studio

AI Resume Studio is a resume-building web app with live AI analysis, authenticated premium features, and Paddle Sandbox billing integration.

## Current live capabilities
- Upload PDF, DOCX, or TXT resumes in the browser and extract readable text client-side
- Build a resume outline from scratch
- Compare a resume against a target job description
- Live AI resume analysis through Supabase Edge Functions
- ATS, keyword-match, and impact scoring
- Email/password account authentication with Supabase Auth
- Paid-plan entitlement checks
- Premium ATS-focused resume rewriting
- Starter-plan rewrite quota enforcement before paid AI requests
- Pro and Studio Premium entitlement handling
- Tailored cover-letter generation for eligible paid plans
- Paddle Sandbox checkout
- Paddle webhook processing and billing data mapping
- Paddle Sandbox subscription-management portal

## Architecture
- Frontend: static HTML/CSS/JavaScript deployed from GitHub
- Backend: Supabase Postgres, Auth, Row Level Security, RPCs, and Edge Functions
- AI: OpenAI API calls from Supabase Edge Functions
- Billing: Paddle Sandbox

Resume files are parsed in the browser; the app sends extracted resume text and related target-job inputs to the Supabase AI functions when the user requests analysis or generation.

## Billing status
Billing is intentionally running in Paddle Sandbox while production launch checks are completed. Live payment processing is not enabled yet.

## Security and usage controls
- Paid AI features require an authenticated user and active entitlement.
- Starter users receive one full resume rewrite per billing period.
- Starter rewrite quota is checked before the paid AI request and claimed only after a successful rewrite.
- Pro and Studio Premium are not subject to the Starter rewrite limit.
- Supabase RLS protects user-owned billing and entitlement data.
- Leaked-password protection remains unavailable on the current Supabase plan and can be enabled after a future Supabase plan upgrade.

## Next stage
1. Complete end-to-end Sandbox purchase and cancellation testing.
2. Verify entitlement changes after Paddle webhook events.
3. Run production-launch QA across resume analysis, rewriting, cover letters, authentication, and billing.
4. Configure production Paddle credentials and products only after Sandbox validation passes.
5. Perform a final security and performance advisor review before production billing is enabled.
