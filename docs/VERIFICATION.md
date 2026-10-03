# Local verification

Verified on Windows with Node.js 24:

- `npm run lint`: passed, with JSX and Rules of Hooks checks.
- `npm test`: ten tests passed, including real PostgreSQL (PGlite) migration/transaction/RLS execution.
- `npm run build`: passed; route-level code splitting produced separate store, account, and admin chunks.
- npm dependency audit at installation: zero reported vulnerabilities.
- Browser: catalog category filter, cart addition, duplicate prevention, correct displayed totals, and unauthenticated checkout redirect verified.
- Browser: mobile menu expands, mobile filters work, and mobile catalog document width equals viewport width (no horizontal overflow).
- Browser: navigation between pages no longer triggers effect-cleanup errors; isolated QA tab reported no console errors.

Hosted Supabase Auth/Storage, production PostgreSQL concurrency, live Razorpay callbacks/webhooks, sender-domain email delivery, and deployment are **not verified** without external credentials. Use the acceptance sequence in OPERATIONS.md before taking live payments. A passing local suite is not a certification or substitute for those checks.
