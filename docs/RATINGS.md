# Verified purchase ratings

Run `supabase/migrations/002_verified_ratings.sql` in Supabase SQL Editor after the initial migration. Existing installations should run only this new migration. New installations run both migrations in numeric order, then the seed.

Buyers can select 1–5 stars in My Library or on the book details page. `POST /api/library/:ebookId/rating` accepts only `{ "rating": 5 }`; user identity comes from the verified session. A paid order, captured matching payment, correct order item, and library ownership are required. The database's existing unique constraint permits one review per buyer/book. Resubmission updates that vote, without increasing the count. Star ratings publish immediately; text reviews are not part of this feature.

Book cards on Home, eBooks, and related books, plus the details page, display the average rounded to one decimal, the number of ratings, and the unique verified purchaser count. No buyer identities are returned. Refunded purchases and their ratings are excluded; failed/pending orders never contribute. A buyer who purchases again after a refund counts once. The backend-only ownership view has no public/anon/authenticated grants, and reviews retain their existing RLS restrictions.

After submitting, the details page refreshes immediately. Open catalog pages refresh in the background every 30 seconds while visible, and on focus. Public catalog responses are not cached. Demo books show zero purchases and “No ratings yet”; demo mode never fabricates buyer activity or permits unverified rating submission.

The SQL integration tests cover eligibility, pending callback rejection, invalid values, one-vote updates, averages, duplicate events, refunds, and direct database access denial. Hosted verification needs your configured Supabase and Razorpay accounts.
