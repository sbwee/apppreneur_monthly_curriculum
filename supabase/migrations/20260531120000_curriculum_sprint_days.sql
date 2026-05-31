-- Per-curriculum learning sprint length (days assignments spread across).
alter table public.curricula
  add column if not exists sprint_days integer not null default 30;

alter table public.curricula
  drop constraint if exists curricula_sprint_days_check;

alter table public.curricula
  add constraint curricula_sprint_days_check
  check (sprint_days >= 7 and sprint_days <= 90);

comment on column public.curricula.sprint_days is
  'Total calendar days the schedule engine spreads assignments across.';
