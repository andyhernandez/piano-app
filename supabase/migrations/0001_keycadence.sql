-- KeyCadence cloud sync schema (applied to the hosted project; also usable on your own).
-- Every local Dexie table syncs as (owner, table_name, key) -> payload. `owner` is a long random
-- family code generated on the parent's device and sent on every request as the x-kc-owner header.
-- Row-level security compares that header to the row, so the publishable key alone reveals nothing.

create or replace function public.kc_owner() returns text
language sql stable
set search_path = ''
as $$
  select coalesce(current_setting('request.headers', true)::json ->> 'x-kc-owner', '');
$$;

create table if not exists public.kc_rows (
  owner       text        not null,
  table_name  text        not null,
  key         text        not null,
  payload     jsonb,
  deleted     boolean     not null default false,
  updated_at  timestamptz not null default now(),
  primary key (owner, table_name, key),
  constraint kc_rows_owner_len check (char_length(owner) >= 12)
);
create index if not exists kc_rows_owner_updated on public.kc_rows (owner, updated_at);
alter table public.kc_rows enable row level security;

create policy "family reads own rows" on public.kc_rows
  for select using (public.kc_owner() <> '' and owner = public.kc_owner());
create policy "family inserts own rows" on public.kc_rows
  for insert with check (public.kc_owner() <> '' and owner = public.kc_owner());
create policy "family updates own rows" on public.kc_rows
  for update using (public.kc_owner() <> '' and owner = public.kc_owner())
  with check (owner = public.kc_owner());

-- Weekly digest opt-ins.
create table if not exists public.kc_digest_subscriptions (
  owner       text primary key,
  email       text not null,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now(),
  constraint kc_digest_owner_len check (char_length(owner) >= 12)
);
alter table public.kc_digest_subscriptions enable row level security;
create policy "family manages own subscription" on public.kc_digest_subscriptions
  for all using (public.kc_owner() <> '' and owner = public.kc_owner())
  with check (owner = public.kc_owner());

-- Run lock for the digest function so an unauthenticated trigger can't spam parents.
-- No policies on purpose: only the service role (used by the edge function) can touch it.
create table if not exists public.kc_digest_runs (
  id          bigserial primary key,
  started_at  timestamptz not null default now(),
  result      jsonb
);
alter table public.kc_digest_runs enable row level security;

-- Recordings bucket: uploads only; recordings stay local-first and are never listed from the cloud.
insert into storage.buckets (id, name, public)
  values ('recordings', 'recordings', false)
  on conflict (id) do nothing;
create policy "recordings upload" on storage.objects
  for insert with check (bucket_id = 'recordings');
