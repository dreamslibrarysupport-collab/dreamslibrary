# Operations and acceptance checks

## Pending orders and reconciliation

An unpaid provider order may still accept a payment. To prevent accidental repurchase, this MVP does not automatically expire or cancel a pending order merely because a browser closed. Resume the exact cart from Account → Orders. A different cart overlapping a pending order returns 409. Coupon capacity reserved by pending orders remains reserved. Never manually cancel or release a pending reservation without verifying the provider order cannot still be paid. A future provider-aware cancellation/reconciliation job belongs here.

Razorpay and PostgreSQL do not share an atomic transaction. The API performs provider order creation inside the database transaction. If Razorpay creates an order but its response is lost or the DB commit fails, an orphan unpaid provider order can exist. Since the browser never receives that order ID, it normally cannot pay it. Use the provider receipt/internal order notes for investigation. Do not auto-fulfill unknown order IDs. A webhook for an unrecognized order returns 409 and rolls back its event marker so retries remain possible.

If an order remains pending after a known successful payment: inspect Razorpay capture status, webhook deliveries/response codes, correct test/live keys, raw-body middleware order, and API database connectivity. Replay the signed event through Razorpay's delivery controls. Never set `orders.status='paid'` manually to bypass the fulfillment transaction. Configure alerts for repeated webhook failure, pending confirmed callbacks, and unknown provider orders.

## Email and download operations

Run `npm run emails -w server` every minute. Payment delivery never depends on the email provider. The outbox uses database locks and a provider idempotency key. Failed deliveries retain their row for retry, up to ten attempts; inspect and reset attempts after fixing configuration. `EMAIL_PROVIDER=log` marks mock deliveries sent and logs only template metadata, not addresses or credentials. Use a real verified email provider before launch. Supabase Auth owns confirmation/password reset email templates and SMTP separately.

`MAX_DOWNLOADS_PER_BOOK=0` leaves downloads unlimited. If enabled, each issued download URL counts once; reader access does not consume the download quota. The future reset UI is not implemented; a trusted operator can remove or archive the relevant download log rows under their retention policy. Do not grant customers mutation rights to downloads. Prefer a future separate quota-reset ledger if log retention is required.

## Acceptance checklist (external credentials required)

1. Apply migration and seed to a fresh Supabase project. Confirm no security advisor errors; attempt direct anonymous selection of `private_file_path` and a private storage object.
2. Register, confirm, log in, log out, refresh a persisted session, request reset, and change password via the email redirect. Confirm role metadata cannot promote a customer.
3. Add a draft book, reject wrong-type uploads, upload a private PDF and public cover/sample, then publish. Confirm the catalog never returns the private path.
4. Try frontend tampered amount, nonexistent UUID, duplicate ID, owned book, and another user's order ID. All must reject or use database-authoritative values.
5. Complete a Razorpay test payment. Verify callback alone leaves pending ownership; captured webhook creates ownership exactly once. Replay delivery and test bad signature, wrong amount/currency, and authorized-only payment.
6. Read/download as buyer; deny another user and expired token. Verify signed URL expiry and download cap. Native PDF viewing support varies by device; use the provided new-tab fallback.
7. Process a full refund and confirm new access is revoked. Confirm a late capture replay does not restore access.
8. Verify dashboard totals, order/customer history, coupon limits, profile update, and queued purchase email. Redeem the same limited coupon concurrently and confirm no oversubscription.
9. Check the deployed mobile layout, deep links, CORS, HTTPS, redirect allowlist, custom SMTP, live webhook, business/legal copy, backups, and monitoring.

## Automated coverage

`npm test` uses Node's test runner and PGlite (actual PostgreSQL compiled to WASM). The integration suite applies the real application migration to stub Auth/Storage schemas, exercises SQL transactions, fulfillment replay, ownership, refunds, provider rollback, and RLS/grant denials. It also tests pure pricing/signature functions and HTTP auth/admin middleware. It does not replace Supabase hosted Auth/Storage or Razorpay sandbox acceptance testing, or load/concurrency testing against a real hosted PostgreSQL instance.

Admin tables have bounded result windows (orders/payments 200, books/customers 500). Add cursor pagination/export for larger catalogs. Store pagination is already implemented. Catalog responses are uncached; visible catalog pages refresh rating and purchase totals every 30 seconds and on focus. The optional watermark interface currently returns the master path; no personalized PDF generation is claimed.
