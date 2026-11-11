begin;
create table public.radar_intelligence (
  project_id uuid primary key references public.radar_projects on delete cascade,
  version int not null default 0,
  checks jsonb not null default '[]'::jsonb check(jsonb_typeof(checks)='array' and jsonb_array_length(checks)<=100),
  draft text check(length(draft)<=1500),
  approved_at timestamptz,
  suppressed boolean not null default false,
  updated_at timestamptz not null default now(),
  check (approved_at is null or (draft is not null and not suppressed))
);
alter table public.radar_intelligence enable row level security;
revoke all on public.radar_intelligence from public,anon,authenticated;
grant select,insert,update,delete on public.radar_intelligence to service_role;
commit;
