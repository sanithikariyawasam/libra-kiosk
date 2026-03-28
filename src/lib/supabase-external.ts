import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://skidrbtiqaouhnvyyiox.supabase.co';
const EXTERNAL_SUPABASE_KEY = 'sb_publishable_QM1ZH0bsaHT4oiXuu1SXkA_BE-KZPMQ';

export const supabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
