import { query } from '../config/db.js';
import { id } from '../validators/index.js';
import { saveRating } from '../services/ratings.js';
export async function rateBook(req, res) {
  res.json({
    data: await saveRating({ query }, req.user.id, id.parse(req.params.ebookId), req.body),
  });
}
