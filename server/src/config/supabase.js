import { createClient } from '@supabase/supabase-js';
let instance;
export function storage() {
  if (!instance)
    instance = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  return instance;
}
