# Supabase setup for KeyCadence

Cloud sync is optional. Without it, everything stays in the browser's IndexedDB.

1. Create a project at https://supabase.com.
2. Apply the schema: `supabase link --project-ref <ref> && supabase db push`, or paste `migrations/0001_keycadence.sql` into the SQL editor.
3. In the app, open **Grown-ups → Account → Cloud sync**, paste the project URL and anon key, and press **Sync now**.
4. Optional weekly digest email:
   - `supabase secrets set RESEND_API_KEY=... DIGEST_FROM="KeyCadence <digest@yourdomain.com>"`
   - `supabase functions deploy weekly-digest`
   - Schedule it weekly (Dashboard → Edge Functions → Schedules, or pg_cron calling the function URL every Sunday evening).
   - Turn on **Weekly digest** in the parent dashboard; the app registers the parent's email in `kc_digest_subscriptions`.

The row-level security policies are permissive because the app uses anonymous device-generated owner ids. If you add Supabase Auth later, tighten them to `owner = auth.uid()::text`.
