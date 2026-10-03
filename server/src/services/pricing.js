import { HttpError } from '../utils/errors.js';
export function calculatePrice(books, coupon = null, now = new Date()) {
  const subtotal = books.reduce((sum, b) => sum + b.price, 0);
  if (
    !books.length ||
    !Number.isSafeInteger(subtotal) ||
    books.some((b) => !Number.isInteger(b.price) || b.price < 100)
  )
    throw new HttpError(400, 'Invalid cart.');
  let discount = 0;
  if (coupon) {
    if (
      !coupon.active ||
      new Date(coupon.starts_at) > now ||
      new Date(coupon.expires_at) <= now ||
      subtotal < coupon.minimum_order ||
      (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses)
    )
      throw new HttpError(400, 'This coupon is unavailable for your order.');
    discount =
      coupon.discount_type === 'percentage'
        ? Math.floor((subtotal * coupon.discount_value) / 100)
        : coupon.discount_value;
    discount = Math.min(discount, subtotal - 100);
  }
  return { subtotal, discount, total: subtotal - discount, currency: 'INR' };
}
