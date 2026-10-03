# Security model

## Trusted boundaries

The browser is untrusted. Local cart entries are convenience data, not prices or proof of ownership. Express verifies every Bearer token with Supabase Auth `getUser`, then reads the user's role from the database. Every admin endpoint uses the same server-side role gate. Supabase's service role and the privileged PostgreSQL connection are server-only.

Every SQL user value is parameterized. Only server-owned column lists and sort allowlists are interpolated. Zod strips extra fields and checks IDs, prices, coupon constraints, slugs, and profile updates. React renders descriptions as text, never raw HTML. Uploads check file magic bytes and size, reject SVG/HTML, and generate their own random object names. An antivirus/content scanning worker can be inserted before publication for untrusted publishers; currently only trusted admins can upload.

## RLS and grants

All application tables have RLS enabled. Explicit grants revoke broad Supabase default privileges:

| Table | Public / customer rights |
|---|---|
| categories | Read all |
| ebooks | Read published rows, public metadata columns only; no `private_file_path` SELECT grant |
| profiles | Read own; update own `full_name` and `avatar_url` only; no role/email write grant |
| orders | Read own only; no writes |
| order_items | Read only if parent order belongs to current user |
| payments | Read own only; no writes |
| user_library | Read own only; no inserts, updates, deletes |
| downloads | Read own only; no writes |
| coupons, webhook_events, email_outbox, newsletter_subscribers, reviews | No direct anon/authenticated access |

There are no broad admin RLS exemptions. Admin actions use the backend. Do not add storage object policies for `ebooks-private`. The two public buckets intentionally contain covers and separate samples only. Review the Supabase security advisor after installation.

## Payment and ownership invariant

Order creation serializes on the user using a transaction-scoped advisory lock. It loads published, file-backed products, rejects ownership, computes paise totals from the database, locks coupon rows, reserves coupon capacity via pending orders, inserts an order and its price snapshots, then obtains a Razorpay order. The client cannot submit a trusted amount. An exact pending cart resumes its existing provider order, even if the new request has a different coupon; the provider's actual stored total is authoritative.

No callback grants access. A valid checkout signature only updates `callback_verified_at`. Webhooks verify HMAC-SHA256 over the exact raw body with timing-safe comparison. Only captured payments whose provider order, total, and currency match the internal order can fulfill it. Webhook event insertion, row lock, payment insertion, status change, library grants, coupon counter, and email outbox are one PostgreSQL transaction. Failure rolls everything back. Event IDs, provider order/payment IDs, one payment per order, and `(user_id, ebook_id)` are unique. A replay under another event ID sees the already paid/refunded order and cannot grant twice.

Full processed refunds revoke library rows transactionally. Out-of-order refund events return a retryable error until the original payment is known. Partial refunds intentionally leave access unchanged and need an operator policy. A payment failure on one Razorpay attempt does not make a still-payable provider order terminal, so no false `failed` transition blocks a later successful attempt.

For each read/download the backend joins authenticated user + ownership + same user's paid order + captured matching payment + master path. It then signs a URL for five minutes by default and logs access. The download limit check and log insert serialize per user/book. The limit counts issued download grants, not observed completed file transfers. Signed URLs are bearer links: anyone holding one can use it until expiry. The browser/native PDF viewer necessarily receives this temporary URL; it is never permanent application metadata.

## Operational controls

Helmet, exact-origin CORS, bounded JSON bodies, upload constraints, API/payment/access rate limits, no-store responses for authenticated APIs, request IDs, secret-safe API errors, and verified TLS are included. CORS alone is not an authorization boundary. JWTs are sent in Authorization headers so no application auth cookie CSRF path is introduced. Supabase's default persistent browser session is vulnerable to XSS like any JS-readable token; maintain dependency updates and consider a BFF/httpOnly cookie design for stricter needs.

The rate-limit memory store is suitable for one instance. Use a shared Redis-backed store before scaling multiple API instances. Configure proxy trust for the actual hosting topology; do not set it to unconditional true. Add a reviewed Content-Security-Policy at your frontend host when configuring the exact Supabase and Razorpay origins. Monitor logs without recording tokens, signed URLs, card data, or raw webhook payloads.
