-- Daily learning time target (MVP §C: "I have 30 minutes a day")
alter table public.profiles
  add column if not exists daily_minutes_goal int not null default 30;

alter table public.profiles
  drop constraint if exists profiles_daily_minutes_goal_check;

alter table public.profiles
  add constraint profiles_daily_minutes_goal_check
  check (daily_minutes_goal >= 5 and daily_minutes_goal <= 480);

comment on column public.profiles.daily_minutes_goal is
  'User default daily learning budget in minutes; used by adaptive scheduling.';
