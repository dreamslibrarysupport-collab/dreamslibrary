import { Router } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, adminOnly } from '../middleware/auth.js';
import * as catalog from '../controllers/catalog.js';
import * as commerce from '../controllers/commerce.js';
import * as admin from '../controllers/admin.js';
import { rateBook } from '../controllers/ratings.js';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/errors.js';
export const router = Router();
router.get('/ebooks', catalog.listBooks);
router.get('/ebooks/:slug', catalog.getBook);
router.get('/categories', catalog.listCategories);
router.post('/newsletter', rateLimit({ windowMs: 3600000, limit: 10 }), async (req, res) => {
  const email = z.email().max(254).parse(req.body.email).toLowerCase();
  if (env.demo)
    throw new HttpError(503, 'Newsletter subscriptions will open when the store launches.');
  await query('insert into newsletter_subscribers(email) values($1) on conflict do nothing', [
    email,
  ]);
  res.json({ data: { subscribed: true } });
});
router.use(authenticate);
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
router.get('/auth/me', (req, res) => res.json({ data: req.user }));
router.get('/profile', (req, res) => res.json({ data: req.user }));
router.patch('/profile', async (req, res) => {
  const input = z.object({ full_name: z.string().trim().min(2).max(100) }).parse(req.body);
  res.json({
    data: (
      await query(
        'update profiles set full_name=$1 where id=$2 returning id,email,full_name,role,created_at',
        [input.full_name, req.user.id],
      )
    ).rows[0],
  });
});
router.post('/cart/validate', commerce.validateCart);
router.post('/coupons/validate', commerce.validateCart);
router.post('/payments/create-order', rateLimit({ windowMs: 60000, limit: 10 }), commerce.newOrder);
router.post('/payments/verify', commerce.verifyPayment);
router.get('/orders', commerce.orders);
router.get('/orders/:id', commerce.orderDetail);
router.get('/library', commerce.library);
router.post(
  '/library/:ebookId/rating',
  rateLimit({ windowMs: 60000, limit: 20, keyGenerator: (req) => req.user.id }),
  rateBook,
);
const accessLimit = rateLimit({ windowMs: 60000, limit: 10, keyGenerator: (req) => req.user.id });
router.post('/library/:ebookId/access', accessLimit, commerce.accessBook);
router.post('/library/:ebookId/download', accessLimit, commerce.accessBook);
const a = Router();
a.use(adminOnly);
a.get('/dashboard', admin.dashboard);
a.get('/ebooks', admin.books);
a.get('/ebooks/:id', admin.books);
a.post('/ebooks', admin.saveBook);
a.patch('/ebooks/:id', admin.saveBook);
a.delete('/ebooks/:id', admin.archiveBook);
a.post(
  '/ebooks/:id/upload/:kind',
  rateLimit({ windowMs: 60000, limit: 15 }),
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 0 },
  }).single('file'),
  admin.upload,
);
a.get('/orders', admin.listOrders);
a.get('/orders/:id', admin.order);
a.get('/customers', admin.customers);
a.get('/customers/:id', admin.customer);
a.get('/payments', admin.payments);
a.get('/coupons', admin.coupons);
a.post('/coupons', admin.saveCoupon);
a.patch('/coupons/:id', admin.saveCoupon);
router.use('/admin', a);
