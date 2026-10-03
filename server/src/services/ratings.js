import { z } from 'zod';
import { HttpError } from '../utils/errors.js';
export const ratingSchema = z.object({ rating: z.number().int().min(1).max(5) }).strict();
export const bookStatsColumns = `
 (select count(*)::int from verified_book_owners v where v.ebook_id=e.id) as purchase_count,
 (select count(*)::int from reviews r join verified_book_owners v on v.user_id=r.user_id and v.ebook_id=r.ebook_id where r.ebook_id=e.id and r.status='published') as rating_count,
 (select round(avg(r.rating),1)::float8 from reviews r join verified_book_owners v on v.user_id=r.user_id and v.ebook_id=r.ebook_id where r.ebook_id=e.id and r.status='published') as average_rating`;
export async function saveRating(db, userId, ebookId, input) {
  const { rating } = ratingSchema.parse(input);
  const result = await db.query(
    `insert into reviews(user_id,ebook_id,rating,review,status)
 select user_id,ebook_id,$3,'','published' from verified_book_owners where user_id=$1 and ebook_id=$2
 on conflict(user_id,ebook_id) do update set rating=excluded.rating,status='published',updated_at=now()
 returning rating,updated_at`,
    [userId, ebookId, rating],
  );
  if (!result.rows.length)
    throw new HttpError(403, 'Only customers with a verified purchase can rate this eBook.');
  return result.rows[0];
}
