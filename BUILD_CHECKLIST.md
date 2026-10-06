# EARTH616 feature and bug checklist

## Implemented and verified

- [x] Cinematic landing page matching the supplied mobile reference; public discovery, explorer/map, marketplace, territory details, rankings, information/legal, account and admin routes.
- [x] Updated Explore to the latest user-supplied globe-dashboard reference: Earth sphere with hex mesh, database-backed selection/details, left tool rail, status/rarity controls, right panel, desktop mini-map, and zoom/locate/view controls.
- [x] Browser-tested 3D → 2D → 3D switching and live zoom updates; responsive screenshots checked at 360/390/414/768/1024/1440px. Fixed tablet CTA clipping and atlas panel overlap.
- [x] Empty catalog remains honest: zero database records, no fabricated territories, prices, owners or rankings.
- [x] Supabase PostgreSQL project `earth616-platform` in the user-approved Earth619 organization, with 14 tables, constraints and RLS. Strict-TLS app connection and read-only tRPC smoke tests pass.
- [x] Migrated the only existing user/profile transactionally; original managed MySQL data remains unchanged as fallback. Empty territories/orders/payments are shown honestly.
- [x] Manus OAuth; authenticated user/account data is scoped to the current account, and admin writes are server-authorized.
- [x] Manual Razorpay.me wallet top-up: amount, payment reference and required HTTPS receipt URL; claims remain pending until admin verification. Admin settlement/rejection is transactional, audited, idempotent and never treats client claims as proof.
- [x] Per-user claim limits, standard response security headers, production HSTS, Sentry client/server instrumentation with PII/request-data scrubbing; one Sentry smoke event was received and its issue resolved.
- [x] Metadata/crawler policy, NASA asset attribution, digital-only disclaimers and loading/error/empty states.
- [x] `pnpm check`, `pnpm test` (10 passed; 2 optional credential checks skipped) and `pnpm build` pass. Preview returns HTTP 200.
- [x] Signed-in wallet and admin-review pages render against Supabase; wallet ledger reconciliation found zero mismatches.
- [x] Created Vercel project shell `earth616-platform`; no production deployment was requested or published.

## Owner-side decisions still required

- [x] **GitHub repository/access:** the owner created the public `Jayanth123-ai/EARTH` repository; the connected account has verified admin/push access.
- [x] **GitHub publication:** pushed the 159-file current source snapshot and project README; commit `657d439` and remote file hashes verified. Secrets, local environment files, dependencies, build output, and internal Git history were excluded.
- [ ] **Territory catalog:** Provide approved IDs/coordinates/rarity/status/prices, or explicitly authorize clearly labeled, non-sale demo territories. Until then, catalog and rankings remain empty.

## Deferred beyond the current preview

No live-money payment was made or simulated. Automated settlement, territory checkout and ownership transfers remain off; a real payment test requires a transaction the owner chooses to make. The Vercel project has no source, production environment secrets or domain and has not been published. A production release will also need the final domain, legal review, broader load/concurrency/recovery testing, production CSP review and an operational reconciliation runbook.

## Product constraints

- E616 is internal platform credit—not cryptocurrency, investment, cash-out or legal tender. Digital territories convey no physical land ownership.
- Razorpay receipt links are untrusted evidence; only independent administrator verification can issue an E616 credit.
- `Connect wallet` is a Manus sign-in explainer, not a cryptocurrency wallet connection.
