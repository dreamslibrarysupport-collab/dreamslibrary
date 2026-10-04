import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import demoCatalog from '../data/demo-catalog.json';
const preview = import.meta.env.VITE_DEMO_MODE === 'true';
export const supabase =
  !preview && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
    : null;
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 20000,
});
if (preview) api.defaults.adapter = async (config) => {
  const url = new URL(config.url, 'https://preview.local');
  let data;
  if (config.method !== 'get') throw new Error('This is a demo. Accounts and purchases will open at launch.');
  if (url.pathname === '/categories') data = { data: demoCatalog.categories };
  else if (url.pathname === '/ebooks') {
    const q = url.searchParams;
    let rows = demoCatalog.books.filter(b =>
      (!q.get('search') || `${b.title} ${b.author}`.toLowerCase().includes(q.get('search').toLowerCase())) &&
      (!q.get('category') || b.category_slug === q.get('category')) &&
      (!q.get('language') || b.language === q.get('language')) &&
      (!q.get('maxPrice') || b.price <= Number(q.get('maxPrice'))) &&
      (!q.get('featured') || b.is_featured) && (!q.get('bestseller') || b.is_bestseller));
    rows = [...rows].sort(q.get('sort') === 'price-asc' ? (a,b) => a.price-b.price : q.get('sort') === 'price-desc' ? (a,b) => b.price-a.price : q.get('sort') === 'popular' ? (a,b) => Number(b.is_bestseller)-Number(a.is_bestseller) : (a,b) => b.created_at.localeCompare(a.created_at));
    const page = Math.max(1, Number(q.get('page')) || 1);
    data = { data: rows.slice((page-1)*12,page*12), total: rows.length, page, demo: true };
  } else if (url.pathname.startsWith('/ebooks/')) {
    const book = demoCatalog.books.find(b => b.slug === decodeURIComponent(url.pathname.slice(8)));
    if (!book) throw new Error('Book not found.');
    data = { data: book };
  } else throw new Error('This feature will be available when the store launches.');
  return { data, status: 200, statusText: 'OK', headers: {}, config };
};
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
