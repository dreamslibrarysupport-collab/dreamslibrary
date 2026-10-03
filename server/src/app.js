import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { router } from './routes/index.js';
import { webhook } from './controllers/commerce.js';
import { errorHandler, HttpError } from './utils/errors.js';
import { env } from './config/env.js';
import { query } from './config/db.js';
export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
app.use((req, res, next) => {
  req.id = randomUUID();
  res.set('X-Request-ID', req.id);
  next();
});
app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
// Must precede express.json and browser rate limits. Invalid webhook HMAC never reaches the DB.
app.post(
  '/api/webhooks/razorpay',
  express.raw({ type: 'application/json', limit: '1mb' }),
  webhook,
);
app.use(express.json({ limit: '100kb' }));
app.use(
  '/api',
  rateLimit({ windowMs: 60000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false }),
);
app.get('/health', (_req, res) => res.json({ status: 'ok', demo: env.demo }));
app.get('/sitemap.xml', async (_req, res) => {
  const books = env.demo
    ? []
    : (await query("select slug from ebooks where status='published'")).rows;
  const escape = (s) =>
    s.replace(
      /[<>&"']/g,
      (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c],
    );
  const urls = ['/', '/ebooks', '/about', '/contact', ...books.map((b) => `/ebook/${b.slug}`)];
  res
    .type('xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((p) => `<url><loc>${escape(env.clientUrl + p)}</loc></url>`).join('')}</urlset>`,
    );
});
app.use('/api', router);
app.use((_req, _res, next) => next(new HttpError(404, 'Endpoint not found.')));
app.use(errorHandler);
