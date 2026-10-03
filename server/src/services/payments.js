import { HttpError } from '../utils/errors.js';
// Called only after raw-body HMAC verification. All changes, including deduplication,
// commit together. Callback verification cannot call this service.
export async function processPaymentEvent(db, eventId, event) {
  if (!['payment.captured', 'order.paid', 'refund.processed'].includes(event.event))
    return { ignored: true };
  const seen = await db.query(
    'insert into webhook_events(id,event_type) values($1,$2) on conflict do nothing returning id',
    [eventId, event.event],
  );
  if (!seen.rows.length) return { duplicate: true };
  if (event.event === 'refund.processed') {
    const refund = event.payload?.refund?.entity;
    const payment = (
      await db.query('select * from payments where razorpay_payment_id=$1 for update', [
        refund?.payment_id,
      ])
    ).rows[0];
    if (!payment) throw new HttpError(409, 'Payment not processed yet; retry refund webhook.');
    // Partial refunds require an explicit policy; never silently revoke a subset.
    if (refund.amount !== payment.amount) return { partialRefund: true };
    await db.query("update payments set status='refunded' where id=$1", [payment.id]);
    await db.query("update orders set status='refunded' where id=$1", [payment.order_id]);
    await db.query('delete from user_library where order_id=$1', [payment.order_id]);
    return { refunded: true };
  }
  const payment = event.payload?.payment?.entity;
  if (!payment || payment.status !== 'captured' || payment.captured !== true)
    throw new HttpError(400, 'Expected a captured payment.');
  const order = (
    await db.query('select * from orders where razorpay_order_id=$1 for update', [payment.order_id])
  ).rows[0];
  if (!order) throw new HttpError(409, 'Order not available yet; retry webhook.');
  if (payment.amount !== order.total || payment.currency !== order.currency)
    throw new HttpError(400, 'Payment amount or currency mismatch.');
  if (order.status === 'paid' || order.status === 'refunded') return { duplicate: true };
  if (order.status !== 'pending') throw new HttpError(409, 'Order is not payable.');
  await db.query(
    "insert into payments(order_id,user_id,razorpay_payment_id,razorpay_order_id,amount,currency,status) values($1,$2,$3,$4,$5,$6,'captured')",
    [order.id, order.user_id, payment.id, payment.order_id, payment.amount, payment.currency],
  );
  await db.query("update orders set status='paid' where id=$1", [order.id]);
  await db.query(
    'insert into user_library(user_id,ebook_id,order_id) select $1,ebook_id,order_id from order_items where order_id=$2 on conflict(user_id,ebook_id) do nothing',
    [order.user_id, order.id],
  );
  if (order.coupon_id)
    await db.query('update coupons set used_count=used_count+1 where id=$1', [order.coupon_id]);
  await db.query(
    "insert into email_outbox(user_id,order_id,template,payload) values($1,$2,'purchase',$3::jsonb) on conflict do nothing",
    [
      order.user_id,
      order.id,
      JSON.stringify({ order_number: order.order_number, total: order.total }),
    ],
  );
  return { paid: true };
}
