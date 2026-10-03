import { writeFileSync } from 'node:fs';
import { categories, demoBooks } from '../src/services/catalog.js';
const sql = (v) =>
  v === null
    ? 'null'
    : typeof v === 'boolean'
      ? String(v)
      : typeof v === 'number'
        ? String(v)
        : `'${String(v).replaceAll("'", "''")}'`;
let out =
  '-- Original fictional catalog metadata. No copyrighted PDFs are included.\n-- Upload each original PDF in Admin before it can be purchased.\nbegin;\n';
for (const c of categories)
  out += `insert into categories(id,name,slug) values(${[c.id, c.name, c.slug].map(sql).join(',')}) on conflict(id) do nothing;\n`;
for (const b of demoBooks) {
  const fields = [
    'id',
    'title',
    'slug',
    'author',
    'description',
    'short_description',
    'category_id',
    'language',
    'pages',
    'price',
    'original_price',
    'is_featured',
    'is_bestseller',
    'publication_date',
    'created_at',
  ];
  out += `insert into ebooks(${fields.join(',')},status,learning_points) values(${fields.map((k) => sql(b[k])).join(',')},'published',${sql(JSON.stringify(b.learning_points))}::jsonb) on conflict(id) do nothing;\n`;
}
out += 'commit;\n';
writeFileSync(new URL('../../supabase/seed.sql', import.meta.url), out);
