import { storage } from '../config/supabase.js';
import { query } from '../config/db.js';
import { HttpError } from '../utils/errors.js';
import { env } from '../config/env.js';
export function authMiddleware({ getUser, getProfile }) {
  return async (req, _res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new HttpError(401, 'Authentication required.');
    const user = await getUser(token);
    if (!user) throw new HttpError(401, 'Your session has expired. Please log in.');
    const profile = await getProfile(user.id);
    if (!profile) throw new HttpError(401, 'Account profile unavailable.');
    req.user = { ...profile, id: user.id };
    next();
  };
}
export const authenticate = authMiddleware({
  getUser: async (token) => {
    if (env.demo) throw new HttpError(503, 'Connect Supabase to enable accounts.');
    const { data, error } = await storage().auth.getUser(token);
    return error ? null : data.user;
  },
  getProfile: async (id) =>
    (
      await query(
        'select id,email,full_name,avatar_url,role,created_at from profiles where id=$1',
        [id],
      )
    ).rows[0],
});
export function adminOnly(req, _res, next) {
  if (req.user?.role !== 'admin') throw new HttpError(403, 'Administrator access required.');
  next();
}
