-- Personal admin calendar ("minha agenda"): the owner's own appointments/events,
-- separate from rep_meetings. Purely internal — no invitees/.ics, just a private
-- schedule the admin manages alongside the rep agenda in the Representantes tab.
create table if not exists admin_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer default 60,
  location text,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_admin_events_scheduled on admin_events (scheduled_at);

-- Admin-only data; the app reaches it through the service-role client, so enable
-- RLS with no public policies (anon/authenticated get nothing).
alter table admin_events enable row level security;
