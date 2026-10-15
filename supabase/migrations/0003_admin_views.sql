-- Read-only views for the KeyCadence admin (the Laravel app in piano-app-admin).
--
-- They live in their own schema on purpose. Supabase serves `public` over its REST API with the publishable
-- key, and a plain view does not apply the row-level security of the table under it, so a view in `public`
-- would hand every family's rows to anyone holding the key. `kc_admin` is not in the API's exposed schemas,
-- and anon/authenticated get no grants on it. The admin connects as its own Postgres role instead.

create schema if not exists kc_admin;
revoke all on schema kc_admin from public, anon, authenticated;

-- One row per synced household.
create or replace view kc_admin.families as
select
  r.owner,
  p.key                                               as parent_id,
  p.payload ->> 'email'                               as email,
  coalesce((p.payload ->> 'weeklyDigest')::boolean, false) as weekly_digest,
  (p.payload ->> 'createdAt')::timestamptz            as created_at,
  max(r.updated_at)                                   as last_synced_at,
  count(*) filter (where r.table_name = 'children' and not r.deleted) as children,
  count(*) filter (where r.table_name = 'sessions' and not r.deleted) as sessions
from public.kc_rows r
left join public.kc_rows p on p.owner = r.owner and p.table_name = 'parents' and not p.deleted
group by r.owner, p.key, p.payload;

create or replace view kc_admin.children as
select
  owner,
  key                                                  as id,
  payload ->> 'parentId'                               as parent_id,
  payload ->> 'name'                                   as name,
  payload ->> 'avatar'                                 as avatar,
  payload ->> 'ageBand'                                as age_band,
  coalesce((payload ->> 'xp')::int, 0)                 as xp,
  coalesce((payload ->> 'stars')::int, 0)              as stars,
  coalesce((payload ->> 'keys')::int, 0)               as keys,
  coalesce((payload ->> 'roadmapIndex')::int, 0)       as roadmap_index,
  payload -> 'scaleOverride'                           as scale_override,
  coalesce((payload -> 'streak' ->> 'current')::int, 0) as streak_current,
  coalesce((payload -> 'streak' ->> 'best')::int, 0)    as streak_best,
  (payload -> 'streak' ->> 'lastActiveDate')::date     as last_active_date,
  (payload ->> 'createdAt')::timestamptz               as created_at,
  updated_at
from public.kc_rows
where table_name = 'children' and not deleted;

create or replace view kc_admin.sessions as
select
  owner,
  key                                                  as id,
  payload ->> 'childId'                                as child_id,
  (payload ->> 'date')::date                           as date,
  (payload ->> 'startedAt')::timestamptz               as started_at,
  nullif(payload ->> 'endedAt', '')::timestamptz       as ended_at,
  coalesce((payload ->> 'durationSec')::int, 0)        as duration_sec,
  coalesce((payload ->> 'plannedMinutes')::int, 0)     as planned_minutes,
  coalesce((payload ->> 'completed')::boolean, false)  as completed,
  payload ->> 'inputMode'                              as input_mode,
  coalesce(payload ->> 'mode', 'guided')               as mode,
  (payload -> 'scale' ->> 'key') || ' ' || (payload -> 'scale' ->> 'mode') as scale,
  coalesce((payload ->> 'xpEarned')::int, 0)           as xp_earned,
  coalesce(jsonb_array_length(payload -> 'blocks'), 0) as block_count,
  updated_at
from public.kc_rows
where table_name = 'sessions' and not deleted;

-- One row per practice stop within a session.
create or replace view kc_admin.blocks as
select
  r.owner,
  r.key                                                as session_id,
  r.payload ->> 'childId'                              as child_id,
  (r.payload ->> 'date')::date                         as date,
  b.ordinality - 1                                     as position,
  b.value ->> 'type'                                   as type,
  coalesce((b.value ->> 'plannedSec')::int, 0)         as planned_sec,
  coalesce((b.value ->> 'durationSec')::int, 0)        as duration_sec,
  coalesce((b.value ->> 'completed')::boolean, false)  as completed,
  coalesce((b.value ->> 'skipped')::boolean, false)    as skipped,
  coalesce(b.value ->> 'inputMode', r.payload ->> 'inputMode') as input_mode,
  b.value -> 'midiScore'                               as midi_score,
  b.value -> 'details'                                 as details
from public.kc_rows r
cross join lateral jsonb_array_elements(coalesce(r.payload -> 'blocks', '[]'::jsonb)) with ordinality as b(value, ordinality)
where r.table_name = 'sessions' and not r.deleted;

-- The admin's own login role. Set its password in the dashboard (Database > Roles) or with
--   alter role kc_admin_reader with password '...';
-- then give Laravel the pooler connection string for this role.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'kc_admin_reader') then
    create role kc_admin_reader login;
  end if;
end $$;
grant usage on schema kc_admin to kc_admin_reader;
grant select on all tables in schema kc_admin to kc_admin_reader;
alter default privileges in schema kc_admin grant select on tables to kc_admin_reader;
