# AI Money Machine — Resume Builder V3

This version pivots the product from side-hustle generation to a resume-building platform.

## Added
- Resume-focused landing page
- Upload Existing Resume path
- Build From Scratch path
- Target a Specific Job path
- Resume analysis preview
- ATS, keyword, and impact scoring preview
- Premium resume rewrite upsell
- Resume-focused pricing
- Career toolkit feature section

## Important
This is still a front-end prototype.

The resume upload field currently stays in the browser and is not sent anywhere.
The frontend calls an existing Supabase resume-analysis function. Email/password
authentication UI and a proposed billing ownership schema are now prepared locally.
The database migrations and Paddle webhook remain undeployed; checkout remains a
preview and paid access is not implemented.

## Local development and validation

Use Node 24 and an installed Chromium browser:

```sh
npm ci --ignore-scripts
npm test
python3 -m http.server 8000 --bind 127.0.0.1 --directory .
```

Set `CHROMIUM_PATH` if Chromium is not installed at `/usr/bin/chromium`.
Read [the authentication foundation handoff](docs/auth-foundation.md) for the
schema, RLS, Auth configuration, deployment gates, and remaining sandbox work.

## Next stage
1. Review and separately authorize applying the account/billing migrations.
2. Validate Supabase Auth configuration and real-project RLS in a controlled test.
3. Implement authenticated sandbox checkout and verified entitlement processing.
4. Complete sandbox testing before any live migration.

Deployments, checkout enablement, and live payments remain paused.
