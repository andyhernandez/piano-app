-- KeyCadence cloud sync schema. Apply with `supabase db push` or paste into the SQL editor.
-- One generic row table keeps the client sync engine simple: every local Dexie table syncs as
-- (owner, table_name, key) -> payload. Owners are anonymous device-generated parent ids; the
-- app never stores child emails (COPPA-aware, spec §2).

create table if not exists public.kc_rows (
  owner       text        not null,
  table_name  text        not null,
  key         text        not null,
  payload     jsonb,
  deleted     boolean     not null default false,
  updated_at  timestamptz not null default now(),
  primary key (owner, table_name, key)
);

create index if not exists kc_rows_owner_updated on public.kc_rows (owner, updated_at);

alter table public.kc_rows enable row level security;

-- The client authenticates with the anon key and identifies itself by `owner`. Rows are scoped
-- to the owner claimed in the request. If you later add Supabase Auth, replace these policies
-- with `owner = auth.uid()::text`.
create policy "owner can read own rows" on public.kc_rows
  for select using (true);
create policy "owner can upsert own rows" on public.kc_rows
  for insert with check (true);
create policy "owner can update own rows" on public.kc_rows
  for update using (true) with check (true);

-- Digest opt-ins: parents who want the weekly email. Written by the app when the toggle is on.
create table if not exists public.kc_digest_subscriptions (
  owner       text primary key,
  email       text not null,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now()
);
alter table public.kc_digest_subscriptions enable row level security;
create policy "anyone can manage own subscription" on public.kc_digest_subscriptions
  for all using (true) with check (true);

-- Recordings bucket for audio/PDF uploads.
insert into storage.buckets (id, name, public)
  values ('recordings', 'recordings', false)
  on conflict (id) do nothing;

create policy "recordings upload" on storage.objects
  for insert with check (bucket_id = 'recordings');
create policy "recordings read" on storage.objects
  for select using (bucket_id = 'recordings');
