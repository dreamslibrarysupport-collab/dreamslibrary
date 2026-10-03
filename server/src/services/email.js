import { env } from '../config/env.js';
export const templates = {
  welcome: () => ({
    subject: 'Welcome to Dream\'s Library',
    text: `A world of ideas is waiting. Explore your next read at ${env.clientUrl}/ebooks`,
  }),
  purchase: (p) => ({
    subject: `Your Dream's Library order ${p.order_number}`,
    text: `Payment received: INR ${(p.total / 100).toFixed(2)}. Your books are ready to read and download in ${env.clientUrl}/library. Order: ${p.order_number}. Thank you for reading with us.`,
  }),
};
export async function sendEmail(to, template, payload, id) {
  const content = templates[template](payload);
  if ((process.env.EMAIL_PROVIDER || 'log') === 'log') {
    console.log(JSON.stringify({ emailMock: true, template, id, subject: content.subject }));
    return;
  }
  if (process.env.EMAIL_PROVIDER !== 'resend' || !process.env.RESEND_API_KEY)
    throw new Error('Email provider not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': id,
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], ...content }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Email provider error ${response.status}`);
}
