

## Plan: Connect Frontend to Your External Supabase Project

This project currently uses Lovable Cloud's built-in database. Since Lovable Cloud cannot be disconnected, the approach is to create a **separate Supabase client** that points to your external project, and have all app code use that client instead.

### What changes

1. **Create a new client file** (`src/lib/supabase-external.ts`)
   - Hardcode your external Supabase URL and publishable key (publishable keys are safe to store in code)
   - Export a `supabase` client instance from this file

2. **Update `LibraryContext.tsx`**
   - Change the import from `@/integrations/supabase/client` to `@/lib/supabase-external`
   - Adjust the `reserveBook` function: your external `reservations` table does not have an `expires_at` column, so remove that field from the insert

3. **Update `scan-return` edge function**
   - The edge function runs on Lovable Cloud's backend and uses `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` env vars, which point to the Lovable Cloud database
   - Since the ESP32 needs to talk to **your** external Supabase, the ESP32 should call your external Supabase edge functions directly (not Lovable's)
   - Alternatively, we can hardcode your external Supabase URL in the edge function and store your external service role key as a secret — but this means the edge function still runs on Lovable's infrastructure while talking to your database

### Important notes

- Your external `reservations` table has columns `(id, member_id, book_id)` — no `expires_at`. The reservation insert will be adjusted accordingly.
- The realtime subscription will only work if your external Supabase project has realtime enabled for the `books` table. You may need to run `ALTER PUBLICATION supabase_realtime ADD TABLE public.books;` in your external project's SQL editor.
- The key you provided (`sb_publishable_QM1ZH0bsaHT4oiXuu1SXkA_BE-KZPMQ`) looks like a non-standard format. Typical Supabase anon keys are JWTs (long base64 strings starting with `eyJ...`). Please verify this is the correct anon/publishable key from your Supabase project settings (Settings → API → anon public key).

### Files modified
| File | Change |
|------|--------|
| `src/lib/supabase-external.ts` | New file — external Supabase client |
| `src/context/LibraryContext.tsx` | Switch import + remove `expires_at` from reservation insert |

