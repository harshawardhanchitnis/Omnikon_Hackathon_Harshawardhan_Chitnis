-- ============================================================
-- ChalkBox
-- Textbook RAG Foundation
--
-- Purpose:
-- 1. Store the six supported demo textbook lessons.
-- 2. Store cleaned textbook chunks.
-- 3. Store Gemini embedding vectors.
-- 4. Provide secure similarity-search RPC for Edge Functions.
--
-- IMPORTANT:
-- Browser clients must NOT directly read/write textbook chunks.
-- Retrieval will happen through a Supabase Edge Function.
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

create extension if not exists vector;


-- ============================================================
-- 2. TEXTBOOK LESSON CATALOG
-- ============================================================

create table if not exists public.textbook_lessons (
  id uuid primary key default gen_random_uuid(),

  lesson_key text not null unique,

  class_level integer not null
    check (class_level between 1 and 12),

  subject text not null,

  title text not null,

  source_file_name text not null,

  is_demo boolean not null default false,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


-- ============================================================
-- 3. TEXTBOOK CHUNKS
-- ============================================================

create table if not exists public.textbook_chunks (
  id uuid primary key default gen_random_uuid(),

  lesson_id uuid not null
    references public.textbook_lessons(id)
    on delete cascade,

  chunk_index integer not null,

  content text not null,

  page_start integer,

  page_end integer,

  section_title text,

  token_count integer,

  metadata jsonb not null default '{}'::jsonb,

  embedding vector(768),

  created_at timestamptz not null default now(),

  unique (lesson_id, chunk_index)
);


-- ============================================================
-- 4. INDEXES
-- ============================================================

create index if not exists textbook_lessons_class_subject_idx
  on public.textbook_lessons (class_level, subject);

create index if not exists textbook_lessons_key_idx
  on public.textbook_lessons (lesson_key);

create index if not exists textbook_chunks_lesson_idx
  on public.textbook_chunks (lesson_id);

create index if not exists textbook_chunks_lesson_chunk_idx
  on public.textbook_chunks (lesson_id, chunk_index);


-- Vector similarity index.
-- This becomes useful as the textbook corpus grows.

create index if not exists textbook_chunks_embedding_hnsw_idx
  on public.textbook_chunks
  using hnsw (embedding vector_cosine_ops);


-- ============================================================
-- 5. AUTOMATIC updated_at
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists textbook_lessons_set_updated_at
  on public.textbook_lessons;


create trigger textbook_lessons_set_updated_at
before update on public.textbook_lessons
for each row
execute function public.set_updated_at();


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

alter table public.textbook_lessons
  enable row level security;

alter table public.textbook_chunks
  enable row level security;


-- IMPORTANT:
--
-- No browser SELECT/INSERT/UPDATE/DELETE policy is intentionally
-- created for textbook_chunks.
--
-- The textbook corpus is backend infrastructure.
--
-- Retrieval will be performed through a Supabase Edge Function
-- using server-side credentials.
--
-- This prevents anonymous/demo users from directly downloading
-- the entire embedded textbook corpus.


-- ============================================================
-- 7. VECTOR RETRIEVAL FUNCTION
-- ============================================================

create or replace function public.match_textbook_chunks(
  p_lesson_key text,
  p_query_embedding vector(768),
  p_match_count integer default 8
)
returns table (
  chunk_id uuid,
  lesson_id uuid,
  lesson_key text,
  lesson_title text,
  chunk_index integer,
  content text,
  page_start integer,
  page_end integer,
  section_title text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    tc.id as chunk_id,
    tl.id as lesson_id,
    tl.lesson_key,
    tl.title as lesson_title,
    tc.chunk_index,
    tc.content,
    tc.page_start,
    tc.page_end,
    tc.section_title,
    1 - (tc.embedding <=> p_query_embedding) as similarity

  from public.textbook_chunks tc

  join public.textbook_lessons tl
    on tl.id = tc.lesson_id

  where
    tl.lesson_key = p_lesson_key
    and tl.is_active = true
    and tc.embedding is not null

  order by
    tc.embedding <=> p_query_embedding

  limit greatest(1, least(p_match_count, 20));
$$;


-- Do not expose the retrieval RPC directly to browser roles.

revoke all
on function public.match_textbook_chunks(
  text,
  vector,
  integer
)
from public;

revoke all
on function public.match_textbook_chunks(
  text,
  vector,
  integer
)
from anon;

revoke all
on function public.match_textbook_chunks(
  text,
  vector,
  integer
)
from authenticated;

grant execute
on function public.match_textbook_chunks(
  text,
  vector,
  integer
)
to service_role;


-- ============================================================
-- 8. SEED THE SIX CHALKBOX DEMO LESSONS
-- ============================================================

insert into public.textbook_lessons (
  lesson_key,
  class_level,
  subject,
  title,
  source_file_name,
  is_demo,
  is_active
)
values

(
  'class-8-chemical-effects-electric-current',
  8,
  'Science',
  'Chemical Effects of Electric Current',
  'NCERT-Class-8-Chemical-Effects-of-Electric-Current-and-Materials-Metals-and-Non-Metals.pdf',
  true,
  true
),

(
  'class-8-materials-metals-non-metals',
  8,
  'Science',
  'Materials: Metals and Non-Metals',
  'NCERT-Class-8-Chemical-Effects-of-Electric-Current-and-Materials-Metals-and-Non-Metals.pdf',
  true,
  true
),

(
  'class-9-force-laws-motion',
  9,
  'Science',
  'Force and Laws of Motion',
  'NCERT-Class-9-Force-and-Laws-of-Motion-and-Work-and-Energy.pdf',
  true,
  true
),

(
  'class-9-work-energy',
  9,
  'Science',
  'Work and Energy',
  'NCERT-Class-9-Force-and-Laws-of-Motion-and-Work-and-Energy.pdf',
  true,
  true
),

(
  'class-10-life-processes',
  10,
  'Science',
  'Life Processes',
  'NCERT-Class-10-Life-Processes-and-Electricity.pdf',
  true,
  true
),

(
  'class-10-electricity',
  10,
  'Science',
  'Electricity',
  'NCERT-Class-10-Life-Processes-and-Electricity.pdf',
  true,
  true
)

on conflict (lesson_key)
do update set

  class_level = excluded.class_level,

  subject = excluded.subject,

  title = excluded.title,

  source_file_name = excluded.source_file_name,

  is_demo = excluded.is_demo,

  is_active = excluded.is_active,

  updated_at = now();


-- ============================================================
-- 9. VERIFICATION
-- ============================================================

select
  lesson_key,
  class_level,
  subject,
  title,
  is_demo,
  is_active

from public.textbook_lessons

order by
  class_level,
  title;