create extension if not exists "pgcrypto";

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  alt_text text not null default '',
  caption text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_photos (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.guest_reviews(id) on delete cascade,
  storage_path text not null unique,
  caption text not null default '',
  sort_order smallint not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderation_note text,
  approved_at timestamptz,
  moderated_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_gallery_images_active_sort
  on public.gallery_images (is_active, sort_order asc, created_at asc);

create index if not exists idx_review_photos_review_sort
  on public.review_photos (review_id, sort_order asc, created_at asc);

create index if not exists idx_review_photos_status_created
  on public.review_photos (status, created_at desc);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_gallery_images_updated_at on public.gallery_images;
create trigger trg_gallery_images_updated_at
before update on public.gallery_images
for each row
execute function public.set_updated_at_timestamp();

alter table public.gallery_images enable row level security;
alter table public.review_photos enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.gallery_images to service_role;
grant select, insert, update, delete on public.review_photos to service_role;

drop policy if exists "Public can read active gallery images" on public.gallery_images;
create policy "Public can read active gallery images"
  on public.gallery_images
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Public can read approved review photos" on public.review_photos;
create policy "Public can read approved review photos"
  on public.review_photos
  for select
  to anon, authenticated
  using (
    status = 'approved'
    and exists (
      select 1
      from public.guest_reviews reviews
      where reviews.id = review_photos.review_id
        and reviews.status = 'approved'
    )
  );

drop policy if exists "Admins can manage gallery images" on public.gallery_images;
create policy "Admins can manage gallery images"
  on public.gallery_images
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_roles ar
      where ar.user_id = auth.uid()
        and ar.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.admin_roles ar
      where ar.user_id = auth.uid()
        and ar.role = 'admin'
    )
  );

drop policy if exists "Admins can manage review photos" on public.review_photos;
create policy "Admins can manage review photos"
  on public.review_photos
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.admin_roles ar
      where ar.user_id = auth.uid()
        and ar.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.admin_roles ar
      where ar.user_id = auth.uid()
        and ar.role = 'admin'
    )
  );
