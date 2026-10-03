import { HttpError } from '../utils/errors.js';
export async function requireOwnership(db, userId, ebookId) {
  const result = await db.query(
    `select l.*,e.private_file_path,e.title,o.order_number,p.full_name,p.email from user_library l
    join ebooks e on e.id=l.ebook_id join orders o on o.id=l.order_id
    join payments pay on pay.order_id=o.id join profiles p on p.id=l.user_id
    where l.user_id=$1 and l.ebook_id=$2 and o.user_id=$1 and pay.user_id=$1
    and o.status='paid' and pay.status='captured' and pay.amount=o.total and pay.currency=o.currency`,
    [userId, ebookId],
  );
  if (!result.rows[0]) throw new HttpError(403, 'You do not own this eBook.');
  if (!result.rows[0].private_file_path)
    throw new HttpError(404, 'The eBook file is unavailable. Please contact support.');
  return result.rows[0];
}
// Extension point: return a path in ebooks-private for a generated, customer-specific
// copy. Keep master immutable; a watermark worker can cache by book version/order.
export async function licensedCopy(ownership) {
  return ownership.private_file_path;
}
