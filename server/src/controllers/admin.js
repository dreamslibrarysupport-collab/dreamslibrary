import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { query } from '../config/db.js';
import { storage } from '../config/supabase.js';
import { bookSchema, couponSchema, id } from '../validators/index.js';
import { HttpError } from '../utils/errors.js';
export async function dashboard(_req, res) {
  const stats = (
    await query(
      `select (select coalesce(sum(total),0) from orders where status='paid') as revenue,(select count(*) from orders) as orders,(select count(*) from profiles where role='customer') as customers,(select count(*) from ebooks) as ebooks,(select count(*) from orders where status='paid') as paid_orders`,
    )
  ).rows[0];
  const series = (
    await query(
      "select to_char(created_at,'YYYY-MM-DD') as day,sum(total)::int as revenue,count(*)::int as orders from orders where status='paid' and created_at>now()-interval '30 days' group by day order by day",
    )
  ).rows;
  const bestsellers = (
    await query(
      "select i.title,count(*)::int as sales from order_items i join orders o on o.id=i.order_id where o.status='paid' group by i.title order by sales desc limit 5",
    )
  ).rows;
  const recent = (
    await query(
      'select o.*,p.email from orders o join profiles p on p.id=o.user_id order by o.created_at desc limit 5',
    )
  ).rows;
  res.json({ data: { ...stats, series, bestsellers, recent } });
}
export async function books(req, res) {
  if (req.params.id) {
    const book = (await query('select * from ebooks where id=$1', [id.parse(req.params.id)]))
      .rows[0];
    if (!book) throw new HttpError(404, 'eBook not found.');
    return res.json({ data: book });
  }
  res.json({
    data: (
      await query(
        'select e.*,c.name as category from ebooks e join categories c on c.id=e.category_id order by e.created_at desc limit 500',
      )
    ).rows,
  });
}
export async function saveBook(req, res) {
  const data = bookSchema.parse(req.body),
    keys = Object.keys(data),
    values = Object.values(data).map((v, i) =>
      keys[i] === 'learning_points' ? JSON.stringify(v) : v,
    );
  // File paths are never accepted from request JSON. Only validated upload endpoints set them.
  if (req.params.id) {
    const bookId = id.parse(req.params.id);
    if (
      data.status === 'published' &&
      !(
        await query('select id from ebooks where id=$1 and private_file_path is not null', [bookId])
      ).rows.length
    )
      throw new HttpError(400, 'Upload a PDF before publishing.');
    const result = await query(
      `update ebooks set ${keys.map((k, i) => `${k}=$${i + 1}`).join(',')} where id=$${keys.length + 1} returning *`,
      [...values, bookId],
    );
    if (!result.rows.length) throw new HttpError(404, 'eBook not found.');
    return res.json({ data: result.rows[0] });
  }
  if (data.status === 'published')
    throw new HttpError(400, 'Save as draft, upload the PDF, then publish.');
  res
    .status(201)
    .json({
      data: (
        await query(
          `insert into ebooks(${keys.join(',')}) values(${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`,
          values,
        )
      ).rows[0],
    });
}
export async function archiveBook(req, res) {
  await query("update ebooks set status='archived' where id=$1", [id.parse(req.params.id)]);
  res.json({ data: { archived: true } });
}
export async function upload(req, res) {
  const bookId = id.parse(req.params.id),
    kind = req.params.kind;
  const config = {
    cover: [
      'book-covers',
      'cover_path',
      5 * 1024 * 1024,
      ['image/jpeg', 'image/png', 'image/webp'],
    ],
    sample: ['book-samples', 'sample_path', 10 * 1024 * 1024, ['application/pdf']],
    file: ['ebooks-private', 'private_file_path', 50 * 1024 * 1024, ['application/pdf']],
  }[kind];
  if (!config || !req.file) throw new HttpError(400, 'Select a valid upload.');
  if (!(await query('select id from ebooks where id=$1', [bookId])).rows.length)
    throw new HttpError(404, 'eBook not found.');
  const type = await fileTypeFromBuffer(req.file.buffer);
  if (!type || !config[3].includes(type.mime) || req.file.size > config[2])
    throw new HttpError(
      400,
      'Invalid file type or size. Covers: JPG/PNG/WebP up to 5 MB; sample: PDF up to 10 MB; book: PDF up to 50 MB.',
    );
  const path = `${bookId}/${randomUUID()}.${type.ext}`;
  const { error } = await storage()
    .storage.from(config[0])
    .upload(path, req.file.buffer, { contentType: type.mime, upsert: false });
  if (error) throw new Error('Storage upload failed');
  try {
    await query(`update ebooks set ${config[1]}=$1 where id=$2`, [path, bookId]);
  } catch (error) {
    await storage().storage.from(config[0]).remove([path]);
    throw error;
  }
  res.json({ data: { uploaded: true } });
}
export async function listOrders(req, res) {
  const status = String(req.query.status || '');
  res.json({
    data: (
      await query(
        "select o.*,p.email,p.full_name from orders o join profiles p on p.id=o.user_id where ($1='' or o.status=$1) order by o.created_at desc limit 200",
        [status],
      )
    ).rows,
  });
}
export async function order(req, res) {
  const item = (
    await query(
      'select o.*,p.email from orders o join profiles p on p.id=o.user_id where o.id=$1',
      [id.parse(req.params.id)],
    )
  ).rows[0];
  if (!item) throw new HttpError(404, 'Order not found.');
  res.json({
    data: {
      ...item,
      items: (await query('select * from order_items where order_id=$1', [item.id])).rows,
      payments: (await query('select * from payments where order_id=$1', [item.id])).rows,
    },
  });
}
export async function customers(_req, res) {
  res.json({
    data: (
      await query(
        "select p.id,p.email,p.full_name,p.created_at,count(o.id)::int as purchases,coalesce(sum(o.total),0) as total_spent from profiles p left join orders o on o.user_id=p.id and o.status='paid' group by p.id order by p.created_at desc limit 500",
      )
    ).rows,
  });
}
export async function customer(req, res) {
  res.json({
    data: (
      await query('select * from orders where user_id=$1 order by created_at desc limit 200', [
        id.parse(req.params.id),
      ])
    ).rows,
  });
}
export async function payments(req, res) {
  res.json({
    data: (
      await query(
        "select pay.*,p.email,o.order_number from payments pay join profiles p on p.id=pay.user_id join orders o on o.id=pay.order_id where ($1='' or pay.status=$1) order by pay.created_at desc limit 200",
        [String(req.query.status || '')],
      )
    ).rows,
  });
}
export async function coupons(_req, res) {
  res.json({ data: (await query('select * from coupons order by expires_at desc')).rows });
}
export async function saveCoupon(req, res) {
  const data = couponSchema.parse(req.body),
    keys = Object.keys(data),
    values = Object.values(data);
  const result = req.params.id
    ? await query(
        `update coupons set ${keys.map((k, i) => `${k}=$${i + 1}`).join(',')} where id=$${keys.length + 1} returning *`,
        [...values, id.parse(req.params.id)],
      )
    : await query(
        `insert into coupons(${keys.join(',')}) values(${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`,
        values,
      );
  res.json({ data: result.rows[0] });
}
