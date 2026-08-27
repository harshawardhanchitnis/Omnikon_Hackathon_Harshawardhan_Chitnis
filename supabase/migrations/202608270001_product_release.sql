begin;

create extension if not exists vector;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.teacher_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_mode text not null check (source_mode in ('topic','private_textbook')),
  source_id text not null,
  title text not null,
  class_level integer check (class_level is null or class_level in (8,9,10)),
  subject text not null default 'Science',
  duration_minutes integer,
  language text,
  resource_level text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, source_mode, source_id)
);

create table if not exists public.teacher_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_source_id text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, plan_source_id)
);

create table if not exists public.lesson_customizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  lesson_identity text not null,
  patches jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, lesson_identity)
);

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0,
  status text not null default 'uploading' check (status in ('uploading','processing','ready','failed')),
  total_pages integer,
  readable_pages integer,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, storage_path)
);

create table if not exists public.source_pages (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.source_documents(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  content text not null,
  readability real not null default 1,
  extraction_method text not null default 'local_text_layer',
  created_at timestamptz not null default now(),
  unique(document_id, page_number)
);

create table if not exists public.source_chunks (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.source_documents(id) on delete cascade,
  chunk_index integer not null,
  page_start integer not null,
  page_end integer not null,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create table if not exists public.ai_usage_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists teacher_plans_owner_updated_idx on public.teacher_plans(owner_id, updated_at desc);
create index if not exists source_documents_owner_updated_idx on public.source_documents(owner_id, updated_at desc);
create index if not exists source_pages_document_page_idx on public.source_pages(document_id, page_number);
create index if not exists source_chunks_document_page_idx on public.source_chunks(document_id, page_start, page_end);
create index if not exists source_chunks_embedding_hnsw on public.source_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists ai_usage_owner_created_idx on public.ai_usage_events(owner_id, created_at desc);

create trigger teacher_plans_updated_at before update on public.teacher_plans for each row execute function public.set_updated_at();
create trigger teacher_notes_updated_at before update on public.teacher_notes for each row execute function public.set_updated_at();
create trigger lesson_customizations_updated_at before update on public.lesson_customizations for each row execute function public.set_updated_at();
create trigger source_documents_updated_at before update on public.source_documents for each row execute function public.set_updated_at();

alter table public.teacher_plans enable row level security;
alter table public.teacher_notes enable row level security;
alter table public.lesson_customizations enable row level security;
alter table public.source_documents enable row level security;
alter table public.source_pages enable row level security;
alter table public.source_chunks enable row level security;
alter table public.ai_usage_events enable row level security;

create policy "teacher_plans_owner_select" on public.teacher_plans for select to authenticated using (owner_id = auth.uid());
create policy "teacher_plans_owner_insert" on public.teacher_plans for insert to authenticated with check (owner_id = auth.uid());
create policy "teacher_plans_owner_update" on public.teacher_plans for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "teacher_plans_owner_delete" on public.teacher_plans for delete to authenticated using (owner_id = auth.uid());

create policy "teacher_notes_owner_all" on public.teacher_notes for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "lesson_customizations_owner_all" on public.lesson_customizations for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "source_documents_owner_all" on public.source_documents for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "source_pages_owner_select" on public.source_pages for select to authenticated using (owner_id = auth.uid());
create policy "source_chunks_owner_select" on public.source_chunks for select to authenticated using (owner_id = auth.uid());

-- AI usage is intentionally server-managed. Teachers do not need direct table access.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('teacher-textbooks', 'teacher-textbooks', false, 26214400, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "teacher_textbooks_owner_select" on storage.objects for select to authenticated
using (bucket_id = 'teacher-textbooks' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "teacher_textbooks_owner_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'teacher-textbooks' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "teacher_textbooks_owner_update" on storage.objects for update to authenticated
using (bucket_id = 'teacher-textbooks' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'teacher-textbooks' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "teacher_textbooks_owner_delete" on storage.objects for delete to authenticated
using (bucket_id = 'teacher-textbooks' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.match_private_textbook_chunks(
  query_embedding vector(768),
  match_document uuid,
  match_count integer default 12
)
returns table (
  chunk_id bigint,
  page_start integer,
  page_end integer,
  content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    sc.id,
    sc.page_start,
    sc.page_end,
    sc.content,
    1 - (sc.embedding <=> query_embedding) as similarity
  from public.source_chunks sc
  where sc.owner_id = auth.uid()
    and sc.document_id = match_document
  order by sc.embedding <=> query_embedding
  limit greatest(1, least(match_count, 24));
$$;

grant execute on function public.match_private_textbook_chunks(vector, uuid, integer) to authenticated;

commit;
