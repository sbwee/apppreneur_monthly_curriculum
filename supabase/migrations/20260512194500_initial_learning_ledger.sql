-- Adaptive Learning Ledger: initial schema + RLS
-- Apply via Supabase Dashboard (SQL Editor) or: supabase db push (when linked)
-- Requires PostgreSQL 13+ (gen_random_uuid in core).

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'App profile row; created when a Supabase Auth user signs up.';

-- ---------------------------------------------------------------------------
-- Resource folders ("folder of links" for syllabus input)
-- ---------------------------------------------------------------------------
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists folders_user_id_idx on public.folders (user_id);

-- ---------------------------------------------------------------------------
-- Resources (captured URLs / PDF links / media references)
-- ---------------------------------------------------------------------------
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete set null,
  url text not null,
  kind text not null default 'other',
  title text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  ingest_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_ingest_status_check check (
    ingest_status in ('pending', 'enriched', 'failed')
  )
);

create index if not exists resources_user_id_idx on public.resources (user_id);
create index if not exists resources_folder_id_idx on public.resources (folder_id);

-- ---------------------------------------------------------------------------
-- Curricula (monthly / sprint container)
-- ---------------------------------------------------------------------------
create table if not exists public.curricula (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete set null,
  title text not null,
  month_start date,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curricula_status_check check (status in ('draft', 'active', 'archived'))
);

create index if not exists curricula_user_id_idx on public.curricula (user_id);

-- ---------------------------------------------------------------------------
-- Curriculum items (ordered plan rows; may reference a resource)
-- ---------------------------------------------------------------------------
create table if not exists public.curriculum_items (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula (id) on delete cascade,
  resource_id uuid references public.resources (id) on delete set null,
  position int not null,
  week_index int,
  day_index int,
  consumption_minutes int,
  practice_minutes int,
  ai_rationale jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_items_position_unique unique (curriculum_id, position)
);

create index if not exists curriculum_items_curriculum_id_idx on public.curriculum_items (curriculum_id);

-- ---------------------------------------------------------------------------
-- Syllabus versions (immutable structured JSON for the Architect)
-- ---------------------------------------------------------------------------
create table if not exists public.syllabus_versions (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula (id) on delete cascade,
  schema_version text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists syllabus_versions_curriculum_id_idx on public.syllabus_versions (curriculum_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Notes (Markdown; optional public asset flag)
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  curriculum_item_id uuid references public.curriculum_items (id) on delete set null,
  body_markdown text not null default '',
  is_public_asset boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_resource_id_idx on public.notes (resource_id);

-- ---------------------------------------------------------------------------
-- Publish settings (showcase toggle + slug; private by default)
-- ---------------------------------------------------------------------------
create table if not exists public.publish_settings (
  curriculum_id uuid primary key references public.curricula (id) on delete cascade,
  is_published boolean not null default false,
  public_slug text unique,
  published_at timestamptz
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger folders_set_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

create trigger resources_set_updated_at
  before update on public.resources
  for each row execute function public.set_updated_at();

create trigger curricula_set_updated_at
  before update on public.curricula
  for each row execute function public.set_updated_at();

create trigger curriculum_items_set_updated_at
  before update on public.curriculum_items
  for each row execute function public.set_updated_at();

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New user -> profile row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Learner'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.resources enable row level security;
alter table public.curricula enable row level security;
alter table public.curriculum_items enable row level security;
alter table public.syllabus_versions enable row level security;
alter table public.notes enable row level security;
alter table public.publish_settings enable row level security;

-- Profiles: own row only
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

create policy profiles_delete_own on public.profiles
  for delete using (auth.uid() = id);

-- Folders
create policy folders_select_own on public.folders
  for select using (auth.uid() = user_id);

create policy folders_insert_own on public.folders
  for insert with check (auth.uid() = user_id);

create policy folders_update_own on public.folders
  for update using (auth.uid() = user_id);

create policy folders_delete_own on public.folders
  for delete using (auth.uid() = user_id);

-- Resources
create policy resources_select_own on public.resources
  for select using (auth.uid() = user_id);

create policy resources_insert_own on public.resources
  for insert with check (
    auth.uid() = user_id
    and (
      folder_id is null
      or exists (select 1 from public.folders f where f.id = folder_id and f.user_id = auth.uid())
    )
  );

create policy resources_update_own on public.resources
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      folder_id is null
      or exists (select 1 from public.folders f where f.id = folder_id and f.user_id = auth.uid())
    )
  );

create policy resources_delete_own on public.resources
  for delete using (auth.uid() = user_id);

-- Curricula
create policy curricula_select_own on public.curricula
  for select using (auth.uid() = user_id);

create policy curricula_insert_own on public.curricula
  for insert with check (
    auth.uid() = user_id
    and (
      folder_id is null
      or exists (select 1 from public.folders f where f.id = folder_id and f.user_id = auth.uid())
    )
  );

create policy curricula_update_own on public.curricula
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      folder_id is null
      or exists (select 1 from public.folders f where f.id = folder_id and f.user_id = auth.uid())
    )
  );

create policy curricula_delete_own on public.curricula
  for delete using (auth.uid() = user_id);

-- Curriculum items (ownership via parent curriculum)
create policy curriculum_items_select_own on public.curriculum_items
  for select using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy curriculum_items_insert_own on public.curriculum_items
  for insert with check (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
    and (
      resource_id is null
      or exists (select 1 from public.resources r where r.id = resource_id and r.user_id = auth.uid())
    )
  );

create policy curriculum_items_update_own on public.curriculum_items
  for update using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
    and (
      resource_id is null
      or exists (select 1 from public.resources r where r.id = resource_id and r.user_id = auth.uid())
    )
  );

create policy curriculum_items_delete_own on public.curriculum_items
  for delete using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

-- Syllabus versions (via curriculum)
create policy syllabus_versions_select_own on public.syllabus_versions
  for select using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy syllabus_versions_insert_own on public.syllabus_versions
  for insert with check (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy syllabus_versions_update_own on public.syllabus_versions
  for update using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy syllabus_versions_delete_own on public.syllabus_versions
  for delete using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

-- Notes
create policy notes_select_own on public.notes
  for select using (auth.uid() = user_id);

create policy notes_insert_own on public.notes
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.resources r where r.id = resource_id and r.user_id = auth.uid())
    and (
      curriculum_item_id is null
      or exists (
        select 1
        from public.curriculum_items ci
        join public.curricula c on c.id = ci.curriculum_id
        where ci.id = curriculum_item_id
          and c.user_id = auth.uid()
      )
    )
  );

create policy notes_update_own on public.notes
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.resources r where r.id = resource_id and r.user_id = auth.uid())
    and (
      curriculum_item_id is null
      or exists (
        select 1
        from public.curriculum_items ci
        join public.curricula c on c.id = ci.curriculum_id
        where ci.id = curriculum_item_id
          and c.user_id = auth.uid()
      )
    )
  );

create policy notes_delete_own on public.notes
  for delete using (auth.uid() = user_id);

-- Publish settings (via curriculum owner)
create policy publish_settings_select_own on public.publish_settings
  for select using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy publish_settings_insert_own on public.publish_settings
  for insert with check (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy publish_settings_update_own on public.publish_settings
  for update using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy publish_settings_delete_own on public.publish_settings
  for delete using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Grants: PostgREST uses authenticated role with JWT; tables live in public
-- ---------------------------------------------------------------------------
grant usage on schema public to postgres, anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;

grant usage, select on all sequences in schema public to postgres, service_role, authenticated;
