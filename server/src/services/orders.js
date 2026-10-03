import { randomUUID } from 'node:crypto';
import Razorpay from 'razorpay';
import { transaction } from '../config/db.js';
import { calculatePrice } from './pricing.js';
import { HttpError } from '../utils/errors.js';
export async function quote(db, userId, ids, code = '', lock = false) {
  const { rows: books } = await db.query(
    `select id,title,price,original_price,cover_path from ebooks where id=any($1::uuid[]) and status='published' and private_file_path is not null ${lock ? 'for share' : ''}`,
    [ids],
  );
  if (books.length !== ids.length) throw new HttpError(400, 'One or more books are unavailable.');
  const owned = await db.query(
    'select ebook_id from user_library where user_id=$1 and ebook_id=any($2::uuid[])',
    [userId, ids],
  );
  if (owned.rows.length)
    throw new HttpError(409, 'Already in your library. Remove owned books before checkout.');
  let coupon = null;
  if (code) {
    coupon = (
      await db.query(`select * from coupons where code=$1 ${lock ? 'for update' : ''}`, [
        code.toUpperCase(),
      ])
    ).rows[0];
    if (!coupon) throw new HttpError(400, 'Coupon not found.');
    // Pending orders reserve capacity so concurrent checkouts cannot oversubscribe a coupon.
    const reserved = await db.query(
      "select count(*)::int as n from orders where coupon_id=$1 and status='pending'",
      [coupon.id],
    );
    coupon = { ...coupon, used_count: coupon.used_count + reserved.rows[0].n };
  }
  return { ...calculatePrice(books, coupon), books, couponId: coupon?.id };
}
export function makeOrderService(runTransaction, createProviderOrder) {
  return async (userId, ids, code = '') =>
    runTransaction(async (db) => {
      await db.query('select pg_advisory_xact_lock(hashtext($1))', [userId]);
      const existing = (
        await db.query(
          "select distinct o.* from orders o join order_items i on i.order_id=o.id where o.user_id=$1 and o.status='pending' and i.ebook_id=any($2::uuid[])",
          [userId, ids],
        )
      ).rows;
      if (existing.length) {
        const items = (
          await db.query('select ebook_id from order_items where order_id=$1', [existing[0].id])
        ).rows.map((r) => r.ebook_id);
        if (
          existing.length === 1 &&
          items.length === ids.length &&
          items.every((i) => ids.includes(i)) &&
          existing[0].razorpay_order_id
        )
          return { ...existing[0], resumed: true };
        throw new HttpError(
          409,
          'An unpaid order already contains one of these books. Resume it from Orders.',
        );
      }
      const priced = await quote(db, userId, ids, code, true);
      const orderId = randomUUID(),
        number = `FL-${new Date().getUTCFullYear()}-${orderId.slice(0, 8).toUpperCase()}`;
      await db.query(
        'insert into orders(id,user_id,order_number,subtotal,discount,total,coupon_id) values($1,$2,$3,$4,$5,$6,$7)',
        [
          orderId,
          userId,
          number,
          priced.subtotal,
          priced.discount,
          priced.total,
          priced.couponId || null,
        ],
      );
      for (const book of priced.books)
        await db.query(
          'insert into order_items(order_id,ebook_id,title,price) values($1,$2,$3,$4)',
          [orderId, book.id, book.title, book.price],
        );
      const provider = await createProviderOrder({
        amount: priced.total,
        currency: 'INR',
        receipt: orderId,
        notes: { internal_order_id: orderId },
      });
      const result = await db.query(
        'update orders set razorpay_order_id=$1 where id=$2 returning *',
        [provider.id, orderId],
      );
      return result.rows[0];
    });
}
export const createOrder = makeOrderService(transaction, async (data) => {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return razorpay.orders.create(data);
});
