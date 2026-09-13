# KeyCadence cloud (Supabase)

The hosted KeyCadence project is already set up, so families don't need to do anything here. This folder documents what's deployed and lets you reproduce it on your own project.

## What's deployed

- `migrations/0001_keycadence.sql`: the `kc_rows` sync table, digest subscriptions, digest run lock, and the `recordings` bucket. Access is scoped by a **family code** sent as the `x-kc-owner` header; row-level security only matches rows with that code, so the publishable key alone reveals nothing.
- `migrations/0002_digest_schedule.sql`: pg_cron job that calls the digest function every Sunday 18:00 UTC.
- `functions/weekly-digest`: Deno edge function that summarises each child's last seven days and emails the parent via Resend. A run lock caps it at one send per six days.

## Using it from the app

Grown-ups → Account → **Cloud sync** → **Turn on sync**. The app creates a family code; type that code into **Join a family** on any other device to share children, sessions, and settings.

## Weekly digest email

The function is deployed. To have it actually send, set two secrets in the Supabase dashboard (Edge Functions → Secrets) or via CLI:

```bash
supabase secrets set RESEND_API_KEY=re_... DIGEST_FROM="KeyCadence <digest@yourdomain.com>"
```

Resend sends only from a verified domain (or its sandbox address for testing). Then turn on **Weekly digest** in the parent dashboard and save an email; the app registers the subscription on the next sync. `GET /functions/v1/weekly-digest?dry=1` previews the text without sending.

## Your own project instead

1. Create a project, apply both migrations (SQL editor or `supabase db push`), edit the project ref in `0002`.
2. Deploy the function: `supabase functions deploy weekly-digest`.
3. In the app: Cloud sync → **Use my own Supabase project**, paste the URL and publishable key, then Turn on sync.
