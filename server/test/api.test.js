import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
process.env.DEMO_MODE = 'true';
const { app } = await import('../src/app.js');
test('public API returns only catalog metadata and applies search/filter/pagination', async () => {
  const all = await request(app).get('/api/ebooks');
  assert.equal(all.status, 200);
  assert.equal(all.body.total, 6);
  assert.equal(all.body.data[0].purchase_count, 0);
  assert.equal(all.body.data[0].rating_count, 0);
  assert.equal(all.body.data[0].average_rating, null);
  assert.equal(JSON.stringify(all.body).includes('private_file_path'), false);
  const filtered = await request(app).get('/api/ebooks?category=technology&search=JavaScript');
  assert.equal(filtered.body.total, 1);
  assert.equal((await request(app).get('/api/ebooks?page=2')).body.data.length, 0);
  assert.equal((await request(app).get('/api/ebooks/nonexistent')).status, 404);
  const sorted = await request(app).get('/api/ebooks?sort=price-asc');
  assert.equal(sorted.body.data[0].price, 24900);
});
test('API refuses unauthenticated orders, admin and file requests', async () => {
  for (const path of ['/api/orders', '/api/library', '/api/admin/dashboard'])
    assert.equal((await request(app).get(path)).status, 401);
  assert.equal(
    (await request(app).post('/api/library/20000000-0000-4000-8000-000000000001/download')).status,
    401,
  );
  assert.equal(
    (await request(app).post('/api/payments/create-order').send({ ebookIds: [], amount: 1 }))
      .status,
    401,
  );
});
test('raw webhook endpoint refuses forged callbacks before database operations', async () => {
  const r = await request(app)
    .post('/api/webhooks/razorpay')
    .set('x-razorpay-signature', 'a'.repeat(64))
    .send({ event: 'payment.captured' });
  assert.equal(r.status, 400);
  assert.equal(r.body.error.message, 'Invalid webhook signature.');
  assert.equal(
    (await request(app).post('/api/payments/verify').send({ success: true })).status,
    401,
  );
});
test('rating endpoint requires authentication', async () => {
  const r = await request(app)
    .post('/api/library/20000000-0000-4000-8000-000000000001/rating')
    .send({ rating: 5 });
  assert.equal(r.status, 401);
});
