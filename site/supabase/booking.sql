create extension if not exists "pgcrypto";

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 80),
  email text not null check (position('@' in trim(email)) > 1),
  phone text not null check (char_length(trim(phone)) between 7 and 30),
  guests integer not null check (guests between 1 and 12),
  rooms integer not null check (rooms between 1 and 6),
  arrival_date date not null,
  departure_date date not null,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  decline_email_enabled boolean not null default true,
  confirmed_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  check (departure_date > arrival_date)
);

create index if not exists idx_booking_requests_status_created_at
  on public.booking_requests (status, created_at asc);

create index if not exists idx_booking_requests_arrival_departure
  on public.booking_requests (arrival_date, departure_date);

create table if not exists public.date_blocks (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid references public.booking_requests(id) on delete set null,
  source_type text not null check (source_type in ('pending_hold', 'booking_confirmed', 'manual_block')),
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  note text not null default '',
  delete_reason text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_date_blocks_active_range
  on public.date_blocks (is_active, start_date, end_date);

create index if not exists idx_date_blocks_booking_request
  on public.date_blocks (booking_request_id);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_date_blocks_updated_at on public.date_blocks;
create trigger trg_date_blocks_updated_at
before update on public.date_blocks
for each row
execute function public.set_updated_at_timestamp();

create table if not exists public.admin_roles (
  user_id uuid primary key,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

alter table public.booking_requests enable row level security;
alter table public.date_blocks enable row level security;
alter table public.admin_roles enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.booking_requests to service_role;
grant select, insert, update, delete on public.date_blocks to service_role;
grant select, insert, update, delete on public.admin_roles to service_role;
grant select on public.admin_roles to authenticated;

drop policy if exists "Users can read own admin role" on public.admin_roles;
create policy "Users can read own admin role"
  on public.admin_roles
  for select
  to authenticated
  using (auth.uid() = user_id);
