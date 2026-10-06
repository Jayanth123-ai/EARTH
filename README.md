# EARTH616

EARTH616 is a full-stack platform for discovering and managing **digital-only territory records**. It combines a cinematic globe explorer, a territory catalog and rankings, user identity levels, an internal E616 credit wallet, and administrative review tools.

> **Digital-only:** EARTH616 records do not represent, convey, or imply ownership of physical land or any real-world property rights. **E616 is an internal platform credit, not cryptocurrency, legal tender, an investment, or cash.**

## Project status

This repository contains the application source for a review/preview build. The owner has chosen to keep the live territory catalog empty for now. The explorer and rankings show their truthful empty states; no territory, price, ownership, or availability data has been invented. Add records only after the owner approves them. Production deployment and real-money payment testing have not been performed.

## Features

- Responsive, cinematic landing experience and immersive globe explorer with 2D/3D viewing, zoom, search, filters, and territory details.
- Territory marketplace/catalog, rankings, account dashboard, and identity progression.
- Manus OAuth authentication and role-checked administrative workflows.
- Server-controlled E616 wallet ledger and manual Razorpay payment-claim review flow. A receipt URL is evidence only: claims stay pending until an administrator independently verifies the payment and approves the credit.
- Supabase PostgreSQL persistence using Drizzle ORM, strict TLS certificate validation, schema migrations, and row-level security.
- Sentry client/server error monitoring.

Automatic payment settlement, territory checkout, and ownership transfer are not enabled. Do not treat this preview as a production financial or property system.

## Technology

- React 19, TypeScript, Vite, Tailwind CSS 4, and Lucide icons
- Express 4, tRPC 11, and SuperJSON
- Drizzle ORM with PostgreSQL (`postgres` driver)
- Supabase PostgreSQL, Manus OAuth, Razorpay manual review, and Sentry
- Vitest for unit/security tests

## Local development

Prerequisites: Node.js 22 and pnpm (the project declares pnpm 10).

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Useful checks:

```bash
pnpm check   # TypeScript
pnpm test    # Vitest
pnpm build   # Production client and server build
pnpm start   # Start the production build
```

The application requires the relevant environment variables and service credentials to be supplied through a secure local or deployment secret manager. Never commit `.env` files, API keys, database URLs, session secrets, or OAuth credentials.

## Environment configuration

The exact set depends on which integrations are enabled. Common server settings include:

- `SUPABASE_DATABASE_URL` — active Supabase PostgreSQL connection string; the server enforces TLS certificate verification.
- `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, and `JWT_SECRET` — Manus OAuth/session configuration.
- `OWNER_OPEN_ID` — owner identity used by the server's role/bootstrap logic; do not place a real value in source control.
- `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY`; `VITE_FRONTEND_FORGE_API_URL` and `VITE_FRONTEND_FORGE_API_KEY` — Manus built-in API configuration where required.
- `SENTRY_DSN` and `VITE_SENTRY_DSN` — optional server and browser error reporting.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` — only for configured server-side Razorpay operations. The current user-facing wallet flow is a manual claim/review process, not an automatic charge/credit flow.
- `DATABASE_URL` — legacy database/migration compatibility only; Supabase is authoritative after the documented cutover.

Do not copy production values into this README or into example configuration committed to the repository. Rotate any credential that is accidentally exposed.

## Database and migrations

The schema is defined in `drizzle/schema.ts`. Migration history is in `drizzle/` and the Supabase-specific migration set is in `drizzle/supabase-migrations/`. Review migrations and target environment carefully before applying database changes; never point a local experiment at production data.

## Security and product safeguards

- Wallet balances, ledger credits, and administrative review are determined server-side; client input cannot issue E616 credits.
- Payment claims require review and remain pending until independent verification. A submitted URL is untrusted evidence.
- Keep the catalog empty unless records and sale availability have been explicitly approved.
- E616 credits and territory records are digital platform features only; they do not promise investment returns, cash redemption, cryptocurrency functionality, or physical land ownership.
- Keep credentials in a secret manager and limit production access to authorized operators.

## Asset attribution

See [`ASSET_CREDITS.md`](ASSET_CREDITS.md) for visual asset attribution and licensing notes.
