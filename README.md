# Dream's Library — digital eBook storefront

A React/Vite storefront and Express REST API with Supabase Auth, PostgreSQL, private Supabase Storage, and Razorpay Checkout. All payment amounts are integer **paise** (₹349 = 34900). Only a signed, captured-payment webhook can create library ownership. A browser success callback alone never unlocks content.

This repository contains the actual application, migrations, seed data, and security tests. External accounts and credentials are deliberately not included. The included read-only catalog preview is not a simulated purchase system. Production use requires the dashboard configuration and acceptance checks below; live payments and hosted storage cannot be verified without your accounts.

## Run locally

Requires Node.js 22+ (Node 24 recommended) and npm.

```sh
npm install
npm run dev
```

Open http://localhost:5173. API: http://localhost:4000. The local ignored `server/.env` initially contains `DEMO_MODE=true`. On a fresh clone, create `server/.env` with that value to preview the seeded catalog without services. Demo mode has no login bypass, fake payments, or downloadable paid files. Account actions explain that configuration is required.

```sh
npm run lint
npm test
npm run build
npm start
```

`npm start` runs the API only. For the built frontend, run `npm run preview -w client` or deploy `client/dist`. Root `npm run check` runs lint, tests, and frontend build.

## Structure

```text
client/
  public/                 favicon and robots.txt
  src/
    components/           shared cards, covers, forms, states, SEO
    context/              Supabase session and persisted cart
    hooks/                cancellable API fetching
    layouts/              store, account, admin layouts
    pages/                catalog, details, checkout, account, library, admin
    routes/               lazy-loaded routes and route guards
    services/             Axios, Supabase, formatting, Razorpay loader
    styles.css            responsive visual system + Tailwind
  vercel.json
server/
  server.js
  src/
    config/               environment, Postgres pool, Supabase server client
    controllers/          catalog, commerce, admin
    middleware/           server-verified authentication and admin role
    routes/               REST wiring and request limits
    services/             pricing, orders, signatures, payment events, library, email
    validators/           strict typed field validation using Zod
    jobs/emails.js        durable email outbox worker
    utils/                consistent API errors
  scripts/seed.mjs        generates the committed SQL seed
  test/                   security and real SQL integration tests using PGlite
supabase/
  migrations/001_initial.sql
  seed.sql
docs/                     security and operations notes
.env.example              complete variable reference
render.yaml               API deployment blueprint
```

## Connect Supabase

1. Create a Supabase project. Save its project URL, public anon key, server-only service-role key, and PostgreSQL connection string. For a hosted Node API, use the dashboard's connection pooler URL. This API does not use named prepared statements and can use transaction pooling.
2. In **SQL Editor**, run `supabase/migrations/001_initial.sql`, then `supabase/migrations/002_verified_ratings.sql`, then `supabase/seed.sql`, in that order. Existing installations should apply only migration 002 for ratings. Run the initial migration only once on a new project. It creates tables, constraints, indexes, RLS policies, profile triggers, and the storage buckets. Back up an existing database before migrating.
3. Check Storage: `book-covers` and `book-samples` are public, `ebooks-private` is **private**. No public policies should grant access to paid files. Bucket upload restrictions are part of the migration.
4. In Authentication → URL Configuration, set your frontend site URL and allow `http://localhost:5173/account`, `http://localhost:5173/reset-password`, plus your production equivalents. Keep email confirmation enabled. Configure production SMTP for reliable confirmation and password reset emails.
5. Copy the backend part of `.env.example` to `server/.env`, fill its values, and change `DEMO_MODE=false`. Use verified database TLS for hosted Supabase (`DATABASE_SSL=true`). If your environment requires a custom CA, configure Node's trusted CA store; do not disable certificate verification in production.
6. Create `client/.env` with the four frontend variables below, then restart Vite. `VITE_SUPABASE_ANON_KEY` is public by design; RLS and column privileges protect data. Never put the service-role key or any payment secret in this file.

```dotenv
VITE_API_URL=http://localhost:4000/api
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
VITE_SITE_URL=http://localhost:5173
```

### First admin

Register and confirm your account in the application. Use Supabase SQL Editor (a trusted operator action):

```sql
update public.profiles set role='admin' where email='your-confirmed-email@example.com';
```

Sign out and in again. Visit `/admin`. Roles are fetched from PostgreSQL on every authenticated API request, never from localStorage, request bodies, or user-editable Auth metadata. Registration cannot assign admin privileges.

### First eBook

1. Open Admin → eBooks → Add eBook.
2. Fill title, a lowercase hyphenated slug, author, category, language, page count, prices in **rupees**, description, and learning points. Save as **draft**.
3. Upload your own PDF (50 MB maximum), a JPG/PNG/WebP cover (5 MB), and optionally a separate public sample PDF (10 MB). File signatures are checked server-side. Do not upload the complete paid book as a sample.
4. Set status to **published** and save. New books cannot publish before a PDF exists. The six seeded fictional titles are visible sample metadata, but checkout rejects them until an original PDF is uploaded. Replace the placeholder descriptions/covers as needed.
5. Archive a title to stop new purchases. Existing owners retain access. Replacing a master does not invalidate already issued signed links; old objects are retained intentionally for safe cleanup later.

## Razorpay setup and purchase testing

1. Create/activate your Razorpay account and generate **test mode** API keys. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the backend. The frontend obtains only the key ID from the create-order response.
2. Enable automatic capture in the Razorpay dashboard. Authorized-but-not-captured payments do not grant books.
3. Add an HTTPS webhook URL: `https://YOUR_API_HOST/api/webhooks/razorpay`. For local testing, use an HTTPS tunnel to port 4000. Set a strong independent webhook secret in the dashboard and `RAZORPAY_WEBHOOK_SECRET` on the API.
4. Subscribe to **payment.captured**, **order.paid**, and **refund.processed**. Webhook raw bytes are verified before parsing; do not put a JSON-transforming proxy in front of this endpoint.
5. Upload a valid PDF, create a separate customer account, add the book, proceed to Checkout, and use Razorpay's documented test payment methods. Do not use real card details in test mode.
6. On success, the callback HMAC is checked and the order page polls for webhook confirmation. The webhook transaction records the captured payment, marks the order paid, creates unique library records, and queues an email. Refresh My Library and test read/download.
7. Send the same webhook again: there must be one payment and one ownership record. Try access as a second customer, without a token, and for an unpurchased book; all must be denied. A failed payment or fabricated browser callback must not grant ownership.
8. Test a full refund in the Razorpay dashboard. After `refund.processed`, the order becomes refunded and library access is revoked. Partial refunds are recorded as processed webhook events but do not revoke a subset of books; settle their entitlement policy manually.

Razorpay references: [Web integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [webhook validation](https://razorpay.com/docs/webhooks/validate-test/). Supabase references: [private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), [storage access control](https://supabase.com/docs/guides/storage/security/access-control).

## Environment reference

| Variable | Where | Purpose |
|---|---|---|
| `PORT` | API | Listener, default 4000; Render provides its port |
| `NODE_ENV` | API | `production` on hosting |
| `CLIENT_URL` | API | Exact frontend origin, CORS / email links / sitemap |
| `DATABASE_URL` | API | Supabase Postgres pooler connection, privileged backend only |
| `DATABASE_SSL` | API | `true` for hosted DB; false only for local Postgres |
| `SUPABASE_URL` | API | Auth and Storage project |
| `SUPABASE_ANON_KEY` | API | Public project configuration reference |
| `SUPABASE_SERVICE_ROLE_KEY` | API only | Auth validation / private storage signing and uploads |
| `RAZORPAY_KEY_ID` | API | Test or live public checkout ID |
| `RAZORPAY_KEY_SECRET` | API only | Order API and checkout HMAC |
| `RAZORPAY_WEBHOOK_SECRET` | API only | Independent raw webhook HMAC |
| `EMAIL_PROVIDER` | API | `log` (safe development mock) or `resend` |
| `EMAIL_FROM` | API | Verified sender identity |
| `RESEND_API_KEY` | API only | Transactional email provider key |
| `SIGNED_URL_TTL` | API | 60–600 seconds, default 300 |
| `MAX_DOWNLOADS_PER_BOOK` | API | 0 = unlimited; download grants per book/user, reads excluded |
| `TRUST_PROXY` | API | Trusted proxy hop count, 0 locally / 1 on Render |
| `DEMO_MODE` | API | Explicit read-only preview; must be false in production |
| `VITE_API_URL` | frontend | Public API base ending `/api` |
| `VITE_SUPABASE_URL` | frontend | Public Auth project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend | Public anon key (never service-role) |
| `VITE_SITE_URL` | frontend | Canonical public frontend origin |

There is no custom `JWT_SECRET`: Supabase issues and validates auth tokens. `VITE_RAZORPAY_KEY_ID` is unnecessary; the server supplies the public key for the active environment.

## Deployment

### Render API

Push this repository to your own Git host. Import `render.yaml` as a Blueprint, or create a Node web service with root repository directory, build `npm ci`, start `npm start -w server`, health check `/health`. Add all server environment variables from the table. Set `DEMO_MODE=false`, `NODE_ENV=production`, `DATABASE_SSL=true`, `TRUST_PROXY=1`, and the exact Vercel domain as `CLIENT_URL`. Run migrations once via Supabase SQL Editor; do not run them on every server start. Use a paid always-on instance for payment webhooks.

### Vercel frontend

Import the repository, choose **Vite**, set Root Directory to `client`, install `npm ci` (enable access to source files outside the root for the workspace lockfile if prompted), build `npm run build`, output `dist`. Add the four `VITE_` variables before building. `client/vercel.json` supplies SPA route fallback and basic security headers. Set `VITE_API_URL` to your Render URL plus `/api`. Rebuild if a Vite variable changes.

### Final external dashboard steps

- Update Supabase Auth Site URL and redirect allowlist to the deployed frontend; set custom SMTP, password policy, and abuse protection.
- Configure Razorpay webhook to the deployed API, verify test purchases, then replace test keys with live keys and separately configure the live webhook secret. Activate the merchant account as required by Razorpay.
- Verify your sender domain with Resend. Set email variables. Schedule `npm run emails -w server` every minute on a worker/cron environment with the same API database/email variables. Supabase handles verification and reset emails separately.
- Replace the Contact and legal-policy launch templates with your business identity, support address, actual policies, and tax details. These are intentionally not fabricated legal documents. Configure an unsubscribe process before sending newsletter campaigns; this MVP stores opt-in subscriptions and does not send marketing campaigns.
- Add your sitemap URL to `client/public/robots.txt`; submit the API `/sitemap.xml` to your search console. The SPA has route-specific title, description, Open Graph, and canonical tags. Add prerendering/SSR later if crawler-independent book previews are required.
- Set backups, error monitoring, and webhook failure alerts. Review `docs/SECURITY.md` and `docs/OPERATIONS.md`.

## Scope and extensions

Implemented: responsive store, filters/search/pagination, book details and samples, Supabase account flows, cart, server checkout and coupons, captured webhook fulfillment, account/orders, private read/download, upload management, admin sales/customers/payments/coupons, durable purchase emails, RLS, and tests. Verified buyers can submit/update 1–5 star ratings; public cards show average ratings and verified purchaser counts. Testimonials and written reviews remain outside this feature. See `docs/RATINGS.md`. The reader uses the browser's native PDF viewer with a direct temporary-link fallback on mobile.

Watermarking has a service boundary (`licensedCopy`) with no master mutation. Implement customer-specific PDF rendering there or in a worker if desired. Google login can be added through Supabase OAuth without changing ownership or role rules. New digital formats can extend the product/storage validators and reader component. PDF DRM cannot completely prevent downloading, copying, screenshots, or redistribution. Short-lived signed links can be shared during their validity and are not immediately revoked by a refund.
