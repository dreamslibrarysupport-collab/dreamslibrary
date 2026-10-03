import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { processPaymentEvent } from '../src/services/payments.js';
import { requireOwnership } from '../src/services/library.js';
import { makeOrderService } from '../src/services/orders.js';
import { saveRating, bookStatsColumns } from '../src/services/ratings.js';
let db;
const u = '30000000-0000-4000-8000-000000000001',
  other = '30000000-0000-4000-8000-000000000002',
  b = '20000000-0000-4000-8000-000000000001',
  b2 = '20000000-0000-4000-8000-000000000002';
before(async () => {
  db = new PGlite();
  await db.exec(
    `create schema auth;create schema storage;create role anon;create role authenticated;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql as 'select null::uuid';create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
  );
  const migration = readFileSync(
    new URL('../../supabase/migrations/001_initial.sql', import.meta.url),
    'utf8',
  ).replace('create extension if not exists pgcrypto;', '');
  await db.exec(migration);
  await db.exec(
    readFileSync(
      new URL('../../supabase/migrations/002_verified_ratings.sql', import.meta.url),
      'utf8',
    ),
  );
  await db.exec(readFileSync(new URL('../../supabase/seed.sql', import.meta.url), 'utf8'));
  await db.query(
    "insert into auth.users(id,email,raw_user_meta_data) values($1,'one@example.com','{}'),($2,'two@example.com','{}')",
    [u, other],
  );
  await db.query("update ebooks set private_file_path='master.pdf'");
});
after(async () => {
  await db?.close();
});
const tx = (work) => db.transaction(work);
let counter = 0;
const orderService = makeOrderService(tx, async (data) => {
  assert.equal(data.amount, 34900);
  return { id: `order_provider_${++counter}` };
});
function event(order, payment = 'pay_1') {
  return {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: payment,
          order_id: order.razorpay_order_id,
          status: 'captured',
          captured: true,
          amount: order.total,
          currency: 'INR',
        },
      },
    },
  };
}
test('purchase lifecycle: pending cannot read; valid webhook grants once; duplicate purchase denied; refund revokes', async () => {
  const order = await orderService(u, [b]);
  assert.equal(order.status, 'pending');
  assert.equal(order.total, 34900);
  const resumed = await orderService(u, [b]);
  assert.equal(resumed.id, order.id);
  assert.equal(counter, 1);
  await assert.rejects(() => requireOwnership(db, u, b), /do not own/);
  await assert.rejects(() => requireOwnership(db, other, b), /do not own/);
  await db.query('update orders set callback_verified_at=now() where id=$1', [order.id]);
  await assert.rejects(() => requireOwnership(db, u, b), /do not own/);
  const bad = event(order);
  bad.payload.payment.entity.amount = 1;
  await assert.rejects(() => tx((d) => processPaymentEvent(d, 'bad', bad)), /mismatch/);
  assert.equal((await db.query("select * from webhook_events where id='bad'")).rows.length, 0);
  assert.deepEqual(await tx((d) => processPaymentEvent(d, 'evt1', event(order))), { paid: true });
  assert.ok((await requireOwnership(db, u, b)).private_file_path);
  await assert.rejects(() => requireOwnership(db, other, b), /do not own/);
  assert.deepEqual(await tx((d) => processPaymentEvent(d, 'evt1', event(order))), {
    duplicate: true,
  });
  assert.deepEqual(await tx((d) => processPaymentEvent(d, 'evt2', event(order))), {
    duplicate: true,
  });
  assert.equal((await db.query('select * from user_library where user_id=$1', [u])).rows.length, 1);
  assert.equal((await db.query('select * from payments')).rows.length, 1);
  await assert.rejects(() => orderService(u, [b]), /Already in your library/);
  const refund = {
    event: 'refund.processed',
    payload: { refund: { entity: { payment_id: 'pay_1', amount: order.total } } },
  };
  await tx((d) => processPaymentEvent(d, 'refund1', refund));
  await assert.rejects(() => saveRating(db, u, b, { rating: 5 }), /verified purchase/);
  await assert.rejects(() => requireOwnership(db, u, b), /do not own/);
  await tx((d) => processPaymentEvent(d, 'late-capture', event(order)));
  await assert.rejects(() => requireOwnership(db, u, b), /do not own/);
});
test('provider failure rolls back internal order and item writes', async () => {
  const fail = makeOrderService(tx, async () => {
    throw new Error('provider unavailable');
  });
  const before = (await db.query('select * from orders')).rows.length;
  await assert.rejects(() => fail(other, [b2]), /provider unavailable/);
  assert.equal((await db.query('select * from orders')).rows.length, before);
});
test('authorization policies deny direct library and role mutation', async () => {
  await db.exec('set role authenticated');
  await assert.rejects(
    () => db.query("update profiles set role='admin' where id=$1", [u]),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      db.query('insert into user_library(user_id,ebook_id,order_id) values($1,$2,$3)', [u, b, u]),
    /permission denied/,
  );
  await assert.rejects(() => db.query('select private_file_path from ebooks'), /permission denied/);
  assert.equal((await db.query('select * from orders')).rows.length, 0);
  assert.ok((await db.query('select title from ebooks')).rows.length > 0);
  await db.exec('reset role');
});
test('only verified buyers rate; edits replace one vote; averages and buyer counts exclude refunds', async () => {
  const stats = async () =>
    (await db.query(`select ${bookStatsColumns} from ebooks e where e.id=$1`, [b])).rows[0];
  assert.deepEqual(await stats(), { purchase_count: 0, rating_count: 0, average_rating: null });
  const order = await orderService(u, [b]);
  await db.query('update orders set callback_verified_at=now() where id=$1', [order.id]);
  await assert.rejects(() => saveRating(db, u, b, { rating: 5 }), /verified purchase/);
  await tx((d) => processPaymentEvent(d, 'rating-capture-1', event(order, 'rating-pay-1')));
  await saveRating(db, u, b, { rating: 5 });
  assert.deepEqual(await stats(), { purchase_count: 1, rating_count: 1, average_rating: 5 });
  await assert.rejects(() => saveRating(db, other, b, { rating: 4 }), /verified purchase/);
  await assert.rejects(() => saveRating(db, u, b2, { rating: 4 }), /verified purchase/);
  for (const rating of [0, 6, 2.5, '5', null])
    await assert.rejects(() => saveRating(db, u, b, { rating }));
  await assert.rejects(() => saveRating(db, u, b, { rating: 5, user_id: other }));
  const second = await orderService(other, [b]);
  await tx((d) => processPaymentEvent(d, 'rating-capture-2', event(second, 'rating-pay-2')));
  await saveRating(db, other, b, { rating: 2 });
  assert.deepEqual(await stats(), { purchase_count: 2, rating_count: 2, average_rating: 3.5 });
  await saveRating(db, u, b, { rating: 4 });
  await saveRating(db, u, b, { rating: 4 });
  assert.deepEqual(await stats(), { purchase_count: 2, rating_count: 2, average_rating: 3 });
  await tx((d) => processPaymentEvent(d, 'rating-replay', event(order, 'rating-pay-1')));
  assert.equal((await stats()).purchase_count, 2);
  await tx((d) =>
    processPaymentEvent(d, 'rating-refund', {
      event: 'refund.processed',
      payload: { refund: { entity: { payment_id: 'rating-pay-2', amount: second.total } } },
    }),
  );
  assert.deepEqual(await stats(), { purchase_count: 1, rating_count: 1, average_rating: 4 });
  await assert.rejects(() => saveRating(db, other, b, { rating: 5 }), /verified purchase/);
  await db.exec('set role authenticated');
  await assert.rejects(() => db.query('select * from verified_book_owners'), /permission denied/);
  await assert.rejects(() => db.query('update reviews set rating=5'), /permission denied/);
  await db.exec('reset role');
});
