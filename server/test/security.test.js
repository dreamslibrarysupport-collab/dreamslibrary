import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { calculatePrice } from '../src/services/pricing.js';
import { verifyHmac, verifyCheckout } from '../src/services/signatures.js';
import { authMiddleware, adminOnly } from '../src/middleware/auth.js';
import { errorHandler } from '../src/utils/errors.js';
import { cartSchema, bookSchema } from '../src/validators/index.js';
test('prices use integer paise and bounded coupon calculations', () => {
  assert.deepEqual(calculatePrice([{ price: 34900 }, { price: 49900 }]), {
    subtotal: 84800,
    discount: 0,
    total: 84800,
    currency: 'INR',
  });
  const coupon = {
    active: true,
    starts_at: '2020-01-01',
    expires_at: '2099-01-01',
    max_uses: 2,
    used_count: 0,
    minimum_order: 0,
    discount_type: 'percentage',
    discount_value: 15,
  };
  assert.equal(calculatePrice([{ price: 34900 }], coupon).total, 29665);
  assert.throws(
    () => calculatePrice([{ price: 1000 }], { ...coupon, used_count: 2 }),
    /unavailable/,
  );
  assert.throws(
    () => calculatePrice([{ price: 1000 }], { ...coupon, expires_at: '2020-02-01' }),
    /unavailable/,
  );
  assert.throws(
    () => calculatePrice([{ price: 1000 }], { ...coupon, minimum_order: 2000 }),
    /unavailable/,
  );
  assert.equal(
    calculatePrice([{ price: 1000 }], { ...coupon, discount_type: 'fixed', discount_value: 5000 })
      .total,
    100,
  );
});
test('signature checks reject malformed, tampered and wrong-secret messages', () => {
  const secret = 'test-secret',
    body = 'order_a|pay_b',
    sig = createHmac('sha256', secret).update(body).digest('hex');
  assert.ok(verifyCheckout('order_a', 'pay_b', sig, secret));
  assert.equal(verifyCheckout('order_fake', 'pay_b', sig, secret), false);
  for (const bad of ['', null, 'zz'.repeat(32), 'a'.repeat(63)])
    assert.equal(verifyHmac(body, bad, secret), false);
  const raw = Buffer.from('{ "payment": true }');
  const webhook = createHmac('sha256', secret).update(raw).digest('hex');
  assert.ok(verifyHmac(raw, webhook, secret));
  assert.equal(verifyHmac(JSON.stringify(JSON.parse(raw)), webhook, secret), false);
  assert.equal(verifyHmac(raw, webhook, 'wrong'), false);
});
test('authentication verifies server user and ignores client role claims', async () => {
  const app = express();
  app.use(express.json());
  app.use(
    authMiddleware({
      getUser: async (token) => (token === 'valid' ? { id: 'u1' } : null),
      getProfile: async () => ({ role: 'customer' }),
    }),
  );
  app.get('/me', (req, res) => res.json(req.user));
  app.post('/admin', adminOnly, (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  assert.equal((await request(app).get('/me')).status, 401);
  assert.equal((await request(app).get('/me').set('Authorization', 'Bearer forged')).status, 401);
  assert.equal((await request(app).get('/me').set('Authorization', 'Bearer valid')).body.id, 'u1');
  assert.equal(
    (await request(app).post('/admin').set('Authorization', 'Bearer valid').send({ role: 'admin' }))
      .status,
    403,
  );
});
test('duplicate books and arbitrary file paths are not trusted', () => {
  const uuid = '20000000-0000-4000-8000-000000000001';
  assert.throws(() => cartSchema.parse({ ebookIds: [uuid, uuid] }));
  const cart = cartSchema.parse({ ebookIds: [uuid], amount: 1, role: 'admin' });
  assert.equal(cart.amount, undefined);
  assert.equal(bookSchema.safeParse({ private_file_path: 'stolen.pdf' }).success, false);
});
