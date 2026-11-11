begin;
create table public.radar_projects (
  id uuid primary key default gen_random_uuid(),
  fields jsonb not null check (jsonb_typeof(fields) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.radar_project_keys (
  key text primary key,
  project_id uuid not null references public.radar_projects on delete cascade
);
create table public.radar_assets (
  id uuid primary key default gen_random_uuid(),
  batch uuid not null,
  sha text not null unique check (sha ~ '^[0-9a-f]{64}$'),
  mime text not null check (mime in ('image/jpeg','image/png','image/webp','image/heic')),
  status text not null default 'pending' check (status in ('pending','processing','review','failed','saved')),
  version int not null default 0,
  attempts int not null default 0,
  observations jsonb not null default '{}'::jsonb,
  error text,
  project_id uuid references public.radar_projects on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index radar_assets_created on public.radar_assets(created_at desc,id);
create index radar_assets_project on public.radar_assets(project_id);
create table public.radar_review_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.radar_assets on delete cascade,
  project_id uuid not null references public.radar_projects on delete cascade,
  actor text not null default 'admin',
  created_at timestamptz not null default now()
);
alter table public.radar_projects enable row level security;
alter table public.radar_project_keys enable row level security;
alter table public.radar_assets enable row level security;
alter table public.radar_review_events enable row level security;
revoke all on public.radar_projects,public.radar_project_keys,public.radar_assets,public.radar_review_events from public,anon,authenticated;
grant select,insert,update,delete on public.radar_projects,public.radar_project_keys,public.radar_assets,public.radar_review_events to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('orbital-radar-evidence','orbital-radar-evidence',false,12000000,array['image/jpeg','image/png','image/webp','image/heic'])
on conflict(id) do nothing;
-- No access policy for clients. Admin routes read via service role.
-- Restrictive policy protects the bucket even if a permissive global policy is added.
create policy radar_evidence_private on storage.objects as restrictive for all to anon,authenticated
using (bucket_id <> 'orbital-radar-evidence') with check (bucket_id <> 'orbital-radar-evidence');

create function public.radar_review(p_asset uuid,p_version int,p_fields jsonb,p_keys text[])
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  a public.radar_assets%rowtype;
  found_ids uuid[];
  pid uuid;
  key_value text;
  reused boolean;
  current_fields jsonb;
begin
  select * into a from public.radar_assets where id=p_asset for update;
  if not found then raise exception 'RADAR_NOT_FOUND'; end if;
  if a.status='saved' then
    return jsonb_build_object('id',a.project_id,'duplicate',true);
  end if;
  if a.version<>p_version or a.status not in ('review','failed') then raise exception 'RADAR_STALE'; end if;
  if coalesce(cardinality(p_keys),0) not between 1 and 2 then raise exception 'RADAR_KEYS'; end if;
  -- Lock all exact identities in stable order, including aliases absent from the table.
  for key_value in select distinct k from unnest(p_keys) as t(k) order by k loop
    perform pg_advisory_xact_lock(hashtextextended(key_value, 5891));
  end loop;
  select array_agg(distinct project_id) into found_ids from public.radar_project_keys where key=any(p_keys);
  if coalesce(cardinality(found_ids),0)>1 then raise exception 'RADAR_CONFLICT'; end if;
  pid := found_ids[1];
  reused := pid is not null;
  if pid is null then
    insert into public.radar_projects(fields) values(p_fields) returning id into pid;
  else
    select fields into current_fields from public.radar_projects where id=pid for update;
    if exists (
      select 1 from jsonb_each_text(p_fields) as f(k,v)
      where current_fields ? k and current_fields->>k <> v and k in ('permit','process','city','state')
    ) then raise exception 'RADAR_CONFLICT'; end if;
    -- Additional evidence fills gaps, never overwrites previously reviewed facts.
    update public.radar_projects set fields=p_fields || current_fields,updated_at=now() where id=pid;
  end if;
  insert into public.radar_project_keys(key,project_id) select distinct k,pid from unnest(p_keys) as t(k) on conflict do nothing;
  update public.radar_assets set status='saved',project_id=pid,version=version+1,updated_at=now(),error=null where id=p_asset;
  insert into public.radar_review_events(asset_id,project_id) values(p_asset,pid);
  return jsonb_build_object('id',pid,'duplicate',reused);
end;
$$;
revoke all on function public.radar_review(uuid,int,jsonb,text[]) from public,anon,authenticated;
grant execute on function public.radar_review(uuid,int,jsonb,text[]) to service_role;
commit;
