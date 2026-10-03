import { createHash } from 'node:crypto';
import { query, transaction } from '../config/db.js';
import { storage } from '../config/supabase.js';
import { env } from '../config/env.js';
import { cartSchema, verifySchema, id } from '../validators/index.js';
import { quote, createOrder } from '../services/orders.js';
import { verifyCheckout, verifyHmac } from '../services/signatures.js';
import { processPaymentEvent } from '../services/payments.js';
import { requireOwnership, licensedCopy } from '../services/library.js';
import { HttpError } from '../utils/errors.js';
export async function validateCart(req, res) {
  const input = cartSchema.parse(req.body);
  res.json({ data: await quote({ query }, req.user.id, input.ebookIds, input.coupon) });
}
export async function newOrder(req, res) {
  const input = cartSchema.parse(req.body);
  res.status(201).json({
    data: {
      ...(await createOrder(req.user.id, input.ebookIds, input.coupon)),
      key: process.env.RAZORPAY_KEY_ID,
    },
  });
}
export async function verifyPayment(req, res) {
  const b = verifySchema.parse(req.body);
  const order = (
    await query('select * from orders where id=$1 and user_id=$2', [b.orderId, req.user.id])
  ).rows[0];
  if (!order) throw new HttpError(404, 'Order not found.');
  if (
    order.razorpay_order_id !== b.razorpay_order_id ||
    !verifyCheckout(
      order.razorpay_order_id,
      b.razorpay_payment_id,
      b.razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET,
    )
  )
    throw new HttpError(400, 'Payment signature verification failed.');
  await query('update orders set callback_verified_at=now() where id=$1', [order.id]);
  res.json({
    data: {
      id: order.id,
      status: order.status,
      message: 'Payment submitted. Waiting for secure payment confirmation.',
    },
  });
}
export async function webhook(req, res) {
  if (
    !Buffer.isBuffer(req.body) ||
    !verifyHmac(req.body, req.headers['x-razorpay-signature'], process.env.RAZORPAY_WEBHOOK_SECRET)
  )
    throw new HttpError(400, 'Invalid webhook signature.');
  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid webhook payload.');
  }
  const eventId = String(
    req.headers['x-razorpay-event-id'] || createHash('sha256').update(req.body).digest('hex'),
  ).slice(0, 200);
  res.json({ data: await transaction((db) => processPaymentEvent(db, eventId, event)) });
}
export async function orders(req, res) {
  const rows = await query(
    `select o.*,coalesce((select json_agg(i) from order_items i where i.order_id=o.id),'[]') as items from orders o where user_id=$1 order by created_at desc limit 100`,
    [req.user.id],
  );
  res.json({ data: rows.rows });
}
export async function orderDetail(req, res) {
  const order = (
    await query('select * from orders where id=$1 and user_id=$2', [
      id.parse(req.params.id),
      req.user.id,
    ])
  ).rows[0];
  if (!order) throw new HttpError(404, 'Order not found.');
  const items = await query('select * from order_items where order_id=$1', [order.id]);
  const payments = await query(
    'select razorpay_payment_id,status,amount,currency,verified_at from payments where order_id=$1',
    [order.id],
  );
  res.json({ data: { ...order, items: items.rows, payments: payments.rows } });
}
export async function library(req, res) {
  const result = await query(
    `select (select r.rating from reviews r where r.user_id=l.user_id and r.ebook_id=l.ebook_id) as my_rating,l.id,l.ebook_id,l.purchased_at,e.title,e.slug,e.author,e.cover_path,c.slug as category_slug from user_library l join ebooks e on e.id=l.ebook_id join categories c on c.id=e.category_id join orders o on o.id=l.order_id join payments p on p.order_id=o.id where l.user_id=$1 and o.user_id=$1 and p.user_id=$1 and o.status='paid' and p.status='captured' order by l.purchased_at desc`,
    [req.user.id],
  );
  res.json({ data: result.rows });
}
export async function accessBook(req, res) {
  const ebookId = id.parse(req.params.ebookId),
    kind = req.path.endsWith('/download') ? 'download' : 'read';
  const result = await transaction(async (db) => {
    await db.query('select pg_advisory_xact_lock(hashtext($1))', [`${req.user.id}:${ebookId}`]);
    const owned = await requireOwnership(db, req.user.id, ebookId);
    if (kind === 'download' && env.maxDownloads > 0) {
      const count = (
        await db.query(
          "select count(*)::int as n from downloads where user_id=$1 and ebook_id=$2 and kind='download'",
          [req.user.id, ebookId],
        )
      ).rows[0].n;
      if (count >= env.maxDownloads)
        throw new HttpError(429, 'Download limit reached. Please contact support.');
    }
    const path = await licensedCopy(owned);
    const { data, error } = await storage()
      .storage.from('ebooks-private')
      .createSignedUrl(
        path,
        env.signedTtl,
        kind === 'download' ? { download: `${owned.title.replace(/[^a-z0-9 -]/gi, '')}.pdf` } : {},
      );
    if (error) throw new Error('Unable to sign eBook access');
    await db.query(
      'insert into downloads(user_id,ebook_id,order_id,ip_address,user_agent,kind) values($1,$2,$3,$4,$5,$6)',
      [
        req.user.id,
        ebookId,
        owned.order_id,
        req.ip,
        String(req.headers['user-agent'] || '').slice(0, 500),
        kind,
      ],
    );
    return { url: data.signedUrl, expiresIn: env.signedTtl };
  });
  res.set('Cache-Control', 'no-store').json({ data: result });
}
