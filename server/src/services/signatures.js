import { createHmac, timingSafeEqual } from 'node:crypto';
export function verifyHmac(body, signature, secret) {
  if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export const verifyCheckout = (orderId, paymentId, signature, secret) =>
  verifyHmac(`${orderId}|${paymentId}`, signature, secret);
