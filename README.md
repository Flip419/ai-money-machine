# AI Money Machine — MVP

This is the first validation build of AI Money Machine.

## What works now
- Responsive landing page
- Side-hustle profile intake
- Five ranked opportunity recommendations
- Skill/interest matching
- Budget, time, income-goal and business-model scoring
- Automation preference scoring
- No backend required for the demo

## Why this version
The fastest route to a real business is to validate the offer before paying for infrastructure. This MVP can be hosted as a static site and used to collect early feedback.

## Next production steps
1. Add user accounts.
2. Add an AI provider behind a secure server-side API.
3. Store profiles and generated plans in a database.
4. Add Stripe subscriptions.
5. Add usage limits by plan.
6. Add email onboarding.
7. Add analytics and conversion tracking.
8. Replace the rule-based recommendations with AI-generated personalized plans.
9. Add the remaining Money Machine tools.

## Important production rule
Never put an AI API secret or Stripe secret key in browser JavaScript. Those belong on a server/serverless function.

## Local testing
Open `index.html` in a modern browser. No build step is required.
