export const env = {
  port: Number(process.env.PORT || 4000),
  production: process.env.NODE_ENV === 'production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  demo: process.env.DEMO_MODE === 'true',
  signedTtl: Math.min(600, Math.max(60, Number(process.env.SIGNED_URL_TTL || 300))),
  maxDownloads: Number(process.env.MAX_DOWNLOADS_PER_BOOK || 0),
};
export function validateEnvironment() {
  if (
    !Number.isFinite(env.signedTtl) ||
    !Number.isInteger(env.maxDownloads) ||
    env.maxDownloads < 0
  )
    throw new Error('Invalid signed URL TTL or download limit');
  if (env.production && env.demo) throw new Error('DEMO_MODE must be false in production');
  if (!env.demo)
    for (const key of [
      'DATABASE_URL',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
    ]) {
      if (!process.env[key]) throw new Error(`Missing ${key}; see .env.example`);
    }
  if (env.production && !env.clientUrl.startsWith('https://'))
    throw new Error('Production CLIENT_URL must use HTTPS');
}
