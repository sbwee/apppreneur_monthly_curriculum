-- Phase 4: calendar assignments (sliding schedule) + velocity snapshots
--
-- PREREQUISITE (required): run this FIRST in the same database:
--   supabase/migrations/20260512194500_initial_learning_ledger.sql
-- That migration creates public.curricula, public.curriculum_items, public.set_updated_at(), etc.
--
-- If you only ran apps/backend/phase0_schema.sql instead, you have public.curriculums (different
-- schema) — the backend in this repo expects public.curricula. Use a fresh project or apply the
-- ledger migration; do not mix phase0_schema.sql with these Phase 4 tables.

-- ---------------------------------------------------------------------------
-- Schedule assignments (one row per curriculum_item in the active calendar)
-- ---------------------------------------------------------------------------
create table if not exists public.schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula (id) on delete cascade,
  curriculum_item_id uuid not null references public.curriculum_items (id) on delete cascade,
  scheduled_date date not null,
  status text not null default 'planned',
  position int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_assignments_status_check check (
    status in ('planned', 'done', 'skipped', 'deferred')
  ),
  constraint schedule_assignments_curriculum_item_unique unique (curriculum_id, curriculum_item_id)
);

create index if not exists schedule_assignments_curriculum_date_idx
  on public.schedule_assignments (curriculum_id, scheduled_date);

create index if not exists schedule_assignments_item_idx
  on public.schedule_assignments (curriculum_item_id);

-- ---------------------------------------------------------------------------
-- Velocity snapshots (rollup for PRD metrics)
-- ---------------------------------------------------------------------------
create table if not exists public.velocity_snapshots (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  resources_completed int not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists velocity_snapshots_curriculum_idx
  on public.velocity_snapshots (curriculum_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse public.set_updated_at)
-- ---------------------------------------------------------------------------
create trigger schedule_assignments_set_updated_at
  before update on public.schedule_assignments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.schedule_assignments enable row level security;
alter table public.velocity_snapshots enable row level security;

create policy schedule_assignments_select_own on public.schedule_assignments
  for select using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy schedule_assignments_insert_own on public.schedule_assignments
  for insert with check (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy schedule_assignments_update_own on public.schedule_assignments
  for update using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy schedule_assignments_delete_own on public.schedule_assignments
  for delete using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy velocity_snapshots_select_own on public.velocity_snapshots
  for select using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy velocity_snapshots_insert_own on public.velocity_snapshots
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy velocity_snapshots_update_own on public.velocity_snapshots
  for update using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  )
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

create policy velocity_snapshots_delete_own on public.velocity_snapshots
  for delete using (
    exists (select 1 from public.curricula c where c.id = curriculum_id and c.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Grants (tables created after initial migration need explicit grants)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on table public.schedule_assignments to postgres, service_role, authenticated;
grant select, insert, update, delete on table public.velocity_snapshots to postgres, service_role, authenticated;
