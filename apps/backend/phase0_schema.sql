-- Phase 0 schema for Monthly Curriculum (Supabase / PostgreSQL)
-- Private-by-default with explicit public showcase opt-in.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curriculums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  goal text,
  daily_minutes integer not null default 30 check (daily_minutes > 0),
  starts_on date not null default current_date,
  ends_on date,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  public_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curriculums(id) on delete cascade,
  source_url text not null,
  title text,
  resource_type text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  ai_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sprint_items (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curriculums(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete set null,
  sequence_order integer not null,
  scheduled_for date not null,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (curriculum_id, sequence_order)
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists curriculums_set_updated_at on public.curriculums;
create trigger curriculums_set_updated_at
before update on public.curriculums
for each row execute procedure public.set_updated_at();

drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at
before update on public.resources
for each row execute procedure public.set_updated_at();

drop trigger if exists sprint_items_set_updated_at on public.sprint_items;
create trigger sprint_items_set_updated_at
before update on public.sprint_items
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.curriculums enable row level security;
alter table public.resources enable row level security;
alter table public.sprint_items enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "curriculums_owner_all" on public.curriculums;
create policy "curriculums_owner_all"
on public.curriculums
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "curriculums_public_read" on public.curriculums;
create policy "curriculums_public_read"
on public.curriculums
for select
using (visibility = 'public');

drop policy if exists "resources_owner_all" on public.resources;
create policy "resources_owner_all"
on public.resources
for all
using (
  exists (
    select 1
    from public.curriculums c
    where c.id = resources.curriculum_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.curriculums c
    where c.id = resources.curriculum_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "resources_public_read" on public.resources;
create policy "resources_public_read"
on public.resources
for select
using (
  exists (
    select 1
    from public.curriculums c
    where c.id = resources.curriculum_id
      and c.visibility = 'public'
  )
);

drop policy if exists "sprint_items_owner_all" on public.sprint_items;
create policy "sprint_items_owner_all"
on public.sprint_items
for all
using (
  exists (
    select 1
    from public.curriculums c
    where c.id = sprint_items.curriculum_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.curriculums c
    where c.id = sprint_items.curriculum_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "sprint_items_public_read" on public.sprint_items;
create policy "sprint_items_public_read"
on public.sprint_items
for select
using (
  exists (
    select 1
    from public.curriculums c
    where c.id = sprint_items.curriculum_id
      and c.visibility = 'public'
  )
);
