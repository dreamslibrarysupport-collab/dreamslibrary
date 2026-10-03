import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { publicColumns, demoBooks, categories } from '../services/catalog.js';
import { HttpError } from '../utils/errors.js';
export async function listBooks(req, res) {
  const page = Math.max(1, Math.min(10000, parseInt(req.query.page) || 1)),
    limit = 12;
  const search = String(req.query.search || '').slice(0, 100),
    category = String(req.query.category || ''),
    language = String(req.query.language || '');
  const max = Number(req.query.maxPrice) || 10000000;
  if (env.demo) {
    let rows = demoBooks.filter(
      (b) =>
        (!search || `${b.title} ${b.author}`.toLowerCase().includes(search.toLowerCase())) &&
        (!category || b.category_slug === category) &&
        (!language || b.language === language) &&
        b.price <= max &&
        (!req.query.featured || b.is_featured) &&
        (!req.query.bestseller || b.is_bestseller),
    );
    rows = [...rows].sort(
      req.query.sort === 'price-asc'
        ? (a, b) => a.price - b.price
        : req.query.sort === 'price-desc'
          ? (a, b) => b.price - a.price
          : req.query.sort === 'popular'
            ? (a, b) => Number(b.is_bestseller) - Number(a.is_bestseller)
            : (a, b) => b.created_at.localeCompare(a.created_at),
    );
    return res.json({
      data: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
      page,
      demo: true,
    });
  }
  const params = [
    `%${search}%`,
    category,
    language,
    max,
    !!req.query.featured,
    !!req.query.bestseller,
  ];
  const where =
    "e.status='published' and (e.title ilike $1 or e.author ilike $1) and ($2='' or c.slug=$2) and ($3='' or e.language=$3) and e.price<=$4 and (not $5 or e.is_featured) and (not $6 or e.is_bestseller)";
  const sort =
    {
      'price-asc': 'e.price asc',
      'price-desc': 'e.price desc',
      popular: 'e.is_bestseller desc,e.created_at desc',
      newest: 'e.created_at desc',
    }[req.query.sort] || 'e.created_at desc';
  const rows = await query(
    `select ${publicColumns} from ebooks e join categories c on c.id=e.category_id where ${where} order by ${sort},e.id limit $7 offset $8`,
    [...params, limit, (page - 1) * limit],
  );
  const count = await query(
    `select count(*)::int as total from ebooks e join categories c on c.id=e.category_id where ${where}`,
    params,
  );
  res
    .set('Cache-Control', 'no-store')
    .json({ data: rows.rows, total: count.rows[0].total, page });
}
export async function getBook(req, res) {
  const book = env.demo
    ? demoBooks.find((b) => b.slug === req.params.slug)
    : (
        await query(
          `select ${publicColumns} from ebooks e join categories c on c.id=e.category_id where e.slug=$1 and e.status='published'`,
          [req.params.slug],
        )
      ).rows[0];
  if (!book) throw new HttpError(404, 'eBook not found.');
  res.json({ data: book });
}
export async function listCategories(_req, res) {
  res.json({
    data: env.demo ? categories : (await query('select * from categories order by name')).rows,
  });
}
