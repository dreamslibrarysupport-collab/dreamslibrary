import { z } from 'zod';
export const id = z.uuid();
export const cartSchema = z.object({
  ebookIds: z
    .array(id)
    .min(1)
    .max(30)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate books'),
  coupon: z.string().trim().max(40).optional().default(''),
});
export const verifySchema = z.object({
  orderId: id,
  razorpay_order_id: z.string().max(100),
  razorpay_payment_id: z.string().max(100),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});
export const bookSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(200),
    author: z.string().trim().min(2).max(120),
    description: z.string().min(10).max(20000),
    short_description: z.string().max(400).default(''),
    category_id: id,
    language: z.string().min(2).max(50),
    pages: z.coerce.number().int().positive(),
    price: z.coerce.number().int().min(100).max(10000000),
    original_price: z.coerce.number().int().min(100).max(10000000),
    publication_date: z.iso.date().nullable().optional(),
    learning_points: z.array(z.string().max(300)).max(20).default([]),
    is_featured: z.boolean(),
    is_bestseller: z.boolean(),
    status: z.enum(['draft', 'published', 'archived']),
  })
  .refine((b) => b.original_price >= b.price, 'Original price must be at least selling price');
export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{2,40}$/),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.coerce.number().int().positive(),
    minimum_order: z.coerce.number().int().nonnegative().default(0),
    max_uses: z.coerce.number().int().positive().nullable(),
    starts_at: z.iso.datetime({ offset: true }),
    expires_at: z.iso.datetime({ offset: true }),
    active: z.boolean(),
  })
  .refine(
    (c) =>
      c.expires_at > c.starts_at && (c.discount_type !== 'percentage' || c.discount_value <= 100),
  );
