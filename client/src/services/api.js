import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
export const supabase =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
    : null;
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 20000,
});
api.interceptors.request.use(async (config) => {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});
export const message = (error) =>
  error.response?.data?.error?.message ||
  error.message ||
  'Something went wrong. Please try again.';
export const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0) / 100);
export const date = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const asset = (path, bucket = 'book-covers') =>
  path && import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
    : null;
export function loadCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      reject(new Error('Unable to load secure checkout. Please retry.'));
    };
    document.body.append(script);
  });
}
