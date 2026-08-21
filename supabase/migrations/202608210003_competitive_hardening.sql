-- ChalkBox competitive hardening: immutable versions/shares, offline revisions,
-- classroom profiles, assessment tools, and moderated community publication.

alter table public.lesson_plans
  add column if not exists record_version integer not null default 1 check (record_version > 0);

alter table public.teaching_sessions
  add column if not exists record_version integer not null default 1 check (record_version > 0),
  add column if not exists updated_at timestamptz not null default now();

alter table public.reflections
  add column if not exists record_version integer not null default 1 check (record_version > 0),
  add column if not exists updated_at timestamptz not null default now();

create trigger teaching_sessions_touch_updated_at
before update on public.teaching_sessions
for each row execute function public.touch_updated_at();

create trigger reflections_touch_updated_at
before update on public.reflections
for each row execute function public.touch_updated_at();

create table public.plan_versions (
  id text primary key,
  plan_id text not null references public.lesson_plans(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  reason text not null check (reason in ('generated', 'manual-checkpoint', 'before-regeneration', 'restored', 'published', 'shared')),
  label text check (label is null or char_length(label) <= 120),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(plan_id, version_number)
);

create table public.share_snapshots (
  id text primary key,
  token text not null unique check (char_length(token) between 16 and 160),
  plan_id text not null references public.lesson_plans(id) on delete cascade,
  plan_version_id text not null references public.plan_versions(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  snapshot jsonb not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index share_snapshots_active_token_idx
on public.share_snapshots(token)
where revoked_at is null;

create table public.classroom_profiles (
  id text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  grade text not null check (grade in ('1','2','3','4','5','6','7','8','9','10')),
  additional_grade text check (additional_grade is null or additional_grade in ('1','2','3','4','5','6','7','8','9','10')),
  learner_count integer not null check (learner_count between 1 and 100),
  board text not null check (board in ('CBSE/NCERT', 'State Board', 'Custom')),
  custom_board text,
  language text not null check (language in ('English', 'Hindi', 'Bilingual English–Hindi')),
  internet_availability text not null check (internet_availability in ('reliable', 'intermittent', 'none')),
  projector_available boolean not null default false,
  chalkboard_available boolean not null default true,
  common_materials text[] not null default '{}',
  mixed_ability boolean not null default true,
  reading_support_needs text[] not null default '{}',
  accessibility_considerations text[] not null default '{}',
  typical_duration_minutes integer not null check (typical_duration_minutes between 20 and 90),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_profiles_distinct_grades check (additional_grade is null or additional_grade <> grade),
  constraint classroom_profiles_custom_board check (board <> 'Custom' or nullif(trim(custom_board), '') is not null)
);

create trigger classroom_profiles_touch_updated_at
before update on public.classroom_profiles
for each row execute function public.touch_updated_at();

create table public.assessment_questions (
  id text primary key,
  owner_id uuid references public.profiles(id) on delete set null,
  board text not null check (board in ('CBSE/NCERT', 'State Board', 'Custom')),
  grade text not null check (grade in ('1','2','3','4','5','6','7','8','9','10')),
  subject text not null,
  custom_subject text,
  book_or_unit text not null default '',
  chapter text not null default '',
  topic text not null,
  prompt text not null check (char_length(prompt) between 3 and 2000),
  type text not null check (type in ('mcq', 'true-false', 'short-answer', 'long-answer', 'fill-blank')),
  purpose text not null check (purpose in ('diagnostic', 'formative', 'exit-ticket', 'application', 'hots')),
  difficulty text not null check (difficulty in ('foundation', 'core', 'challenge')),
  language text not null check (language in ('English', 'Hindi', 'Bilingual English–Hindi')),
  marks integer not null check (marks between 1 and 20),
  options jsonb,
  answer text not null,
  explanation text,
  misconception_target text,
  provenance text not null check (provenance in ('curriculum-source', 'licensed-oer', 'chalkbox-authored', 'teacher-authored', 'ai-derived')),
  review_state text not null default 'unreviewed' check (review_state in ('unreviewed', 'teacher-reviewed', 'curator-approved')),
  source_id uuid references public.curriculum_sources(id) on delete set null,
  attribution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_custom_subject check (subject <> 'Custom' or nullif(trim(custom_subject), '') is not null),
  constraint assessment_ai_review check (provenance <> 'ai-derived' or review_state <> 'curator-approved' or attribution is not null)
);

create index assessment_questions_taxonomy_idx
on public.assessment_questions(board, grade, subject, chapter, topic);

create trigger assessment_questions_touch_updated_at
before update on public.assessment_questions
for each row execute function public.touch_updated_at();

create table public.worksheets (
  id text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  instructions text not null default '' check (char_length(instructions) <= 1000),
  grade text not null,
  subject text not null,
  custom_subject text,
  chapter text not null default '',
  language text not null check (language in ('English', 'Hindi', 'Bilingual English–Hindi')),
  include_answers boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'ready')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger worksheets_touch_updated_at
before update on public.worksheets
for each row execute function public.touch_updated_at();

create table public.worksheet_items (
  id text primary key,
  worksheet_id text not null references public.worksheets(id) on delete cascade,
  question_id text references public.assessment_questions(id) on delete set null,
  question_snapshot jsonb not null,
  item_order integer not null check (item_order >= 0),
  marks integer not null check (marks between 1 and 20),
  unique(worksheet_id, item_order)
);

create table public.community_publications (
  id text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.lesson_plans(id) on delete cascade,
  plan_version_id text not null references public.plan_versions(id) on delete restrict,
  snapshot jsonb not null,
  author_name text not null,
  author_school text not null default '',
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'withdrawn', 'unpublished')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  saves integer not null default 0 check (saves >= 0),
  adaptations integer not null default 0 check (adaptations >= 0),
  reports integer not null default 0 check (reports >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_publications_status_idx
on public.community_publications(status, submitted_at desc);

create trigger community_publications_touch_updated_at
before update on public.community_publications
for each row execute function public.touch_updated_at();

create table public.publication_reports (
  id text primary key,
  publication_id text not null references public.community_publications(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('inaccurate', 'unsafe', 'copyright', 'spam', 'other')),
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique(publication_id, reporter_id)
);

create table public.quick_checks (
  id text primary key,
  plan_id text not null references public.lesson_plans(id) on delete cascade,
  session_id text not null references public.teaching_sessions(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  activity_id text,
  prompt text not null check (char_length(prompt) between 3 and 600),
  mode text not null check (mode in ('abcd', 'understanding')),
  counts jsonb not null,
  correct_key text,
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create or replace function public.guard_publication_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.owner_id <> auth.uid() then
    raise exception 'publication owner mismatch';
  end if;
  if tg_op = 'INSERT' and new.status not in ('draft', 'submitted') then
    raise exception 'teacher cannot self-approve publication';
  end if;
  if tg_op = 'UPDATE' and not (
    (old.status = 'draft' and new.status in ('draft', 'submitted')) or
    (old.status = 'submitted' and new.status in ('submitted', 'withdrawn')) or
    (old.status = 'approved' and new.status in ('approved', 'unpublished'))
  ) then
    raise exception 'invalid teacher publication transition';
  end if;
  if tg_op = 'UPDATE' and (
    new.reviewed_at is distinct from old.reviewed_at or
    new.reviewed_by is distinct from old.reviewed_by or
    new.rejection_reason is distinct from old.rejection_reason
  ) then
    raise exception 'teacher cannot set moderation fields';
  end if;
  return new;
end;
$$;

create trigger community_publications_guard_transition
before insert or update on public.community_publications
for each row execute function public.guard_publication_transition();

alter table public.plan_versions enable row level security;
alter table public.share_snapshots enable row level security;
alter table public.classroom_profiles enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.worksheets enable row level security;
alter table public.worksheet_items enable row level security;
alter table public.community_publications enable row level security;
alter table public.publication_reports enable row level security;
alter table public.quick_checks enable row level security;

create policy "plan_versions_owner_or_admin_read" on public.plan_versions
for select using (owner_id = auth.uid() or public.is_admin());
create policy "plan_versions_owner_insert" on public.plan_versions
for insert with check (owner_id = auth.uid());

create policy "shares_owner_or_active_public_read" on public.share_snapshots
for select using (
  owner_id = auth.uid()
  or public.is_admin()
  or (revoked_at is null and (expires_at is null or expires_at > now()))
);
create policy "shares_owner_insert" on public.share_snapshots
for insert with check (owner_id = auth.uid());
create policy "shares_owner_revoke" on public.share_snapshots
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "classrooms_owner_all" on public.classroom_profiles
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "questions_approved_or_owner_read" on public.assessment_questions
for select using (review_state = 'curator-approved' or owner_id = auth.uid() or public.is_admin());
create policy "questions_teacher_insert" on public.assessment_questions
for insert with check (owner_id = auth.uid() and review_state <> 'curator-approved');
create policy "questions_teacher_update" on public.assessment_questions
for update using (owner_id = auth.uid())
with check (owner_id = auth.uid() and review_state <> 'curator-approved');
create policy "questions_admin_all" on public.assessment_questions
for all using (public.is_admin()) with check (public.is_admin());

create policy "worksheets_owner_all" on public.worksheets
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "worksheet_items_owner_all" on public.worksheet_items
for all using (
  exists (select 1 from public.worksheets w where w.id = worksheet_id and w.owner_id = auth.uid())
)
with check (
  exists (select 1 from public.worksheets w where w.id = worksheet_id and w.owner_id = auth.uid())
);

create policy "publications_approved_or_owner_read" on public.community_publications
for select using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy "publications_owner_insert" on public.community_publications
for insert with check (owner_id = auth.uid());
create policy "publications_owner_or_admin_update" on public.community_publications
for update using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());
create policy "reports_owner_insert" on public.publication_reports
for insert with check (reporter_id = auth.uid());
create policy "reports_owner_or_admin_read" on public.publication_reports
for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports_admin_update" on public.publication_reports
for update using (public.is_admin()) with check (public.is_admin());

create policy "quick_checks_owner_all" on public.quick_checks
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, insert on public.plan_versions to authenticated;
grant select on public.share_snapshots to anon, authenticated;
grant insert on public.share_snapshots to authenticated;
grant update (revoked_at, expires_at) on public.share_snapshots to authenticated;
grant select, insert, update, delete on public.classroom_profiles to authenticated;
grant select, insert, update on public.assessment_questions to authenticated;
grant select, insert, update, delete on public.worksheets, public.worksheet_items to authenticated;
grant select, insert, update on public.community_publications to authenticated;
grant select, insert, update on public.publication_reports to authenticated;
grant select, insert, update, delete on public.quick_checks to authenticated;
create or replace function public.match_curriculum_chunks_hybrid(
  query_embedding extensions.vector(768),
  query_text text,
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
  with ranked as (
    select
      c.id,
      c.content,
      c.metadata,
      1 - (c.embedding <=> query_embedding) as vector_score,
      ts_rank_cd(
        to_tsvector('simple', c.content),
        websearch_to_tsquery('simple', coalesce(nullif(trim(query_text), ''), 'lesson'))
      ) as lexical_score,
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
  )
  select
    ranked.id,
    ranked.content,
    ranked.metadata,
    (0.72 * ranked.vector_score + 0.28 * least(1.0, ranked.lexical_score))::double precision,
    ranked.title,
    ranked.publisher,
    ranked.source_url,
    ranked.licence,
    ranked.attribution
  from ranked
  order by (0.72 * ranked.vector_score + 0.28 * least(1.0, ranked.lexical_score)) desc
  limit greatest(1, least(match_count, 10));
$$;

revoke all on function public.match_curriculum_chunks_hybrid(
  extensions.vector, text, integer, text, text, text
) from public;
grant execute on function public.match_curriculum_chunks_hybrid(
  extensions.vector, text, integer, text, text, text
) to authenticated, service_role;
