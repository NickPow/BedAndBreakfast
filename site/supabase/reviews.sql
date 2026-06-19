create extension if not exists "pgcrypto";

create table if not exists public.guest_reviews (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 80),
  location text,
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text not null check (char_length(trim(comment)) between 20 and 3000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderation_note text,
  approved_at timestamptz,
  moderated_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_guest_reviews_status_created_at
  on public.guest_reviews (status, created_at desc);

alter table public.guest_reviews enable row level security;

drop policy if exists "Public can read approved reviews" on public.guest_reviews;
create policy "Public can read approved reviews"
  on public.guest_reviews
  for select
  to anon, authenticated
  using (status = 'approved');
