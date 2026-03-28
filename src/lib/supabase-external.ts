import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://skidrbtiqaouhnvyyiox.supabase.co';
const EXTERNAL_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNraWRyYnRpcWFvdWhudnl5aW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTc1NzIsImV4cCI6MjA4OTM5MzU3Mn0.ewUwdWkFKnCvtg2ay4TxpCu0ySHZvwKL6zFxq8XYRZQ';

export const supabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
