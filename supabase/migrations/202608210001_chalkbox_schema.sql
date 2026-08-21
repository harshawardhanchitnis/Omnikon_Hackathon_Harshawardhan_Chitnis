create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('teacher', 'admin');
create type public.plan_status as enum ('draft', 'ready', 'taught', 'archived');
create type public.generation_mode as enum ('ai', 'prepared-demo', 'manual', 'community-clone');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'teacher',
  full_name text not null default 'ChalkBox Teacher' check (char_length(full_name) between 1 and 120),
  school_name text not null default '',
  district text not null default '',
  state text not null default '',
  preferred_language text not null default 'English',
  grades text[] not null default '{}',
  subjects text[] not null default '{}',
  onboarding_complete boolean not null default false,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create table public.lesson_plans (
  id text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 180),
  subject text not null,
  grade text not null,
  topic text not null check (char_length(topic) between 3 and 180),
  status public.plan_status not null default 'draft',
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  is_public boolean not null default false,
  public_slug text unique,
  generation_mode public.generation_mode not null default 'manual',
  parent_plan_id text references public.lesson_plans(id) on delete set null,
  plan_data jsonb not null,
  taught_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_slug_required_when_public check (not is_public or public_slug is not null)
);

create index lesson_plans_owner_updated_idx on public.lesson_plans(owner_id, updated_at desc);
create index lesson_plans_public_idx on public.lesson_plans(is_public, subject, grade) where is_public;

create table public.teaching_sessions (
  id text primary key,
  plan_id text not null references public.lesson_plans(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  current_activity_index integer not null default 0 check (current_activity_index >= 0),
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  paused boolean not null default false,
  attendance_count integer check (attendance_count between 0 and 250),
  quick_notes jsonb not null default '[]'::jsonb
);

create table public.check_ins (
  id text primary key,
  plan_id text not null references public.lesson_plans(id) on delete cascade,
  session_id text references public.teaching_sessions(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  understanding smallint not null check (understanding between 1 and 5),
  engagement smallint not null check (engagement between 1 and 5),
  pace text not null check (pace in ('too-slow', 'right', 'too-fast')),
  evidence text not null default '' check (char_length(evidence) <= 1000),
  created_at timestamptz not null default now()
);

create table public.reflections (
  id text primary key,
  plan_id text not null references public.lesson_plans(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  went_well text not null check (char_length(went_well) between 10 and 1000),
  improve_next_time text not null check (char_length(improve_next_time) between 10 and 1000),
  student_outcome text not null check (student_outcome in ('not-yet', 'partly', 'mostly', 'fully')),
  rating smallint not null check (rating between 1 and 5),
  next_step text not null check (char_length(next_step) between 3 and 500),
  created_at timestamptz not null default now()
);

create table public.experts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  specialties text[] not null default '{}',
  languages text[] not null default '{}',
  availability jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  expert_id uuid not null references public.experts(id) on delete restrict,
  plan_id text references public.lesson_plans(id) on delete set null,
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 10 and 120),
  status text not null check (status in ('requested', 'confirmed', 'completed', 'cancelled')),
  agenda text not null check (char_length(agenda) <= 1000),
  created_at timestamptz not null default now()
);

create table public.guidance_plans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  expert_id uuid references public.experts(id) on delete set null,
  title text not null,
  goal text not null,
  status text not null check (status in ('active', 'complete', 'paused')),
  created_at timestamptz not null default now()
);

create table public.action_tasks (
  id uuid primary key default gen_random_uuid(),
  guidance_plan_id uuid not null references public.guidance_plans(id) on delete cascade,
  plan_id text references public.lesson_plans(id) on delete set null,
  title text not null,
  due_at timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'teacher',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.curriculum_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  publisher text not null,
  source_url text not null,
  licence text not null check (char_length(licence) > 0),
  attribution text not null check (char_length(attribution) > 0),
  grade text,
  subject text,
  board text,
  approved boolean not null default false,
  content_hash text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.curriculum_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.curriculum_sources(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) between 20 and 4000),
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(768),
  created_at timestamptz not null default now(),
  unique(source_id, chunk_index)
);

create index curriculum_chunks_embedding_idx on public.curriculum_chunks using hnsw (embedding extensions.vector_cosine_ops) where embedding is not null;

create table public.generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_id text not null unique,
  model text not null,
  provider text not null default 'gemini',
  status text not null check (status in ('started', 'passed', 'repaired', 'failed', 'limited')),
  latency_ms integer,
  retrieval_count integer not null default 0,
  quality_score integer check (quality_score between 0 and 100),
  error_code text,
  created_at timestamptz not null default now()
);

create index generation_events_user_day_idx on public.generation_events(user_id, created_at desc);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger lesson_plans_touch_updated_at before update on public.lesson_plans for each row execute function public.touch_updated_at();
create trigger curriculum_sources_touch_updated_at before update on public.curriculum_sources for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, is_anonymous)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), case when coalesce(new.is_anonymous, false) then 'Demo Teacher' else 'ChalkBox Teacher' end),
    coalesce(new.is_anonymous, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.match_curriculum_chunks(
  query_embedding extensions.vector(768),
  match_count integer default 6,
  filter_grade text default null,
  filter_subject text default null,
  filter_board text default null
)
returns table (
  chunk_id uuid,
  content text,
  metadata jsonb,
  similarity double precision,
  source_title text,
  publisher text,
  source_url text,
  licence text,
  attribution text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    c.id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity,
    s.title,
    s.publisher,
    s.source_url,
    s.licence,
    s.attribution
  from public.curriculum_chunks c
  join public.curriculum_sources s on s.id = c.source_id
  where s.approved = true
    and c.embedding is not null
    and (filter_grade is null or s.grade is null or s.grade = filter_grade)
    and (filter_subject is null or s.subject is null or s.subject = filter_subject)
    and (filter_board is null or s.board is null or s.board = filter_board)
  order by c.embedding <=> query_embedding
  limit greatest(1, least(match_count, 10));
$$;

revoke all on function public.match_curriculum_chunks(extensions.vector, integer, text, text, text) from public;
grant execute on function public.match_curriculum_chunks(extensions.vector, integer, text, text, text) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.lesson_plans enable row level security;
alter table public.teaching_sessions enable row level security;
alter table public.check_ins enable row level security;
alter table public.reflections enable row level security;
alter table public.experts enable row level security;
alter table public.appointments enable row level security;
alter table public.guidance_plans enable row level security;
alter table public.action_tasks enable row level security;
alter table public.invitations enable row level security;
alter table public.notifications enable row level security;
alter table public.curriculum_sources enable row level security;
alter table public.curriculum_chunks enable row level security;
alter table public.generation_events enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles_read_self" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "plans_read_owner_or_public" on public.lesson_plans for select using (owner_id = auth.uid() or is_public or public.is_admin());
create policy "plans_insert_owner" on public.lesson_plans for insert with check (owner_id = auth.uid());
create policy "plans_update_owner" on public.lesson_plans for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "plans_delete_owner" on public.lesson_plans for delete using (owner_id = auth.uid());

create policy "sessions_owner_all" on public.teaching_sessions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "checkins_owner_all" on public.check_ins for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "reflections_owner_all" on public.reflections for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "experts_authenticated_read" on public.experts for select to authenticated using (active or public.is_admin());
create policy "experts_admin_write" on public.experts for all using (public.is_admin()) with check (public.is_admin());
create policy "appointments_teacher_read" on public.appointments for select using (teacher_id = auth.uid() or public.is_admin());
create policy "appointments_teacher_insert" on public.appointments for insert with check (teacher_id = auth.uid());
create policy "appointments_admin_update" on public.appointments for update using (teacher_id = auth.uid() or public.is_admin()) with check (teacher_id = auth.uid() or public.is_admin());
create policy "guidance_teacher_read" on public.guidance_plans for select using (teacher_id = auth.uid() or public.is_admin());
create policy "guidance_admin_write" on public.guidance_plans for all using (public.is_admin()) with check (public.is_admin());
create policy "actions_teacher_read" on public.action_tasks for select using (exists (select 1 from public.guidance_plans g where g.id = guidance_plan_id and (g.teacher_id = auth.uid() or public.is_admin())));
create policy "actions_admin_write" on public.action_tasks for all using (public.is_admin()) with check (public.is_admin());
create policy "invitations_owner_read" on public.invitations for select using (inviter_id = auth.uid() or public.is_admin());
create policy "invitations_owner_insert" on public.invitations for insert with check (inviter_id = auth.uid());
create policy "notifications_owner_all" on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "sources_authenticated_read" on public.curriculum_sources for select to authenticated using (approved or public.is_admin());
create policy "sources_admin_write" on public.curriculum_sources for all using (public.is_admin()) with check (public.is_admin());
create policy "chunks_admin_read" on public.curriculum_chunks for select using (public.is_admin());
create policy "chunks_admin_write" on public.curriculum_chunks for all using (public.is_admin()) with check (public.is_admin());
create policy "events_owner_read" on public.generation_events for select using (user_id = auth.uid() or public.is_admin());
create policy "audit_admin_read" on public.audit_events for select using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.lesson_plans to anon;
grant select, insert, update, delete on public.lesson_plans, public.teaching_sessions, public.check_ins, public.reflections to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, school_name, district, state, preferred_language, grades, subjects, onboarding_complete, last_active_at) on public.profiles to authenticated;
grant select on public.experts, public.curriculum_sources to authenticated;
grant select on public.curriculum_chunks, public.audit_events to authenticated;
grant insert, update, delete on public.experts, public.curriculum_sources, public.curriculum_chunks, public.guidance_plans, public.action_tasks to authenticated;
grant select, insert, update on public.appointments to authenticated;
grant select on public.guidance_plans, public.action_tasks, public.generation_events to authenticated;
grant select, insert on public.invitations to authenticated;
grant select, update, delete on public.notifications to authenticated;
