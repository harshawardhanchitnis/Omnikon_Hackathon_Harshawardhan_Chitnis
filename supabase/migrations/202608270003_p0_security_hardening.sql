begin;

-- P0 production hardening for the authenticated ChalkBox workspace.
-- Existing owner-scoped policies remain authoritative; FORCE RLS prevents
-- accidental table-owner bypass while service-role/BYPASSRLS server code
-- continues to perform the controlled ingestion writes.

alter table public.teacher_plans force row level security;
alter table public.teacher_notes force row level security;
alter table public.lesson_customizations force row level security;
alter table public.source_documents force row level security;
alter table public.source_pages force row level security;
alter table public.source_chunks force row level security;
alter table public.ai_usage_events force row level security;

-- Keep the Data API surface explicit. RLS still decides row visibility.
revoke all on table public.teacher_plans from anon;
revoke all on table public.teacher_notes from anon;
revoke all on table public.lesson_customizations from anon;
revoke all on table public.source_documents from anon;
revoke all on table public.source_pages from anon;
revoke all on table public.source_chunks from anon;
revoke all on table public.ai_usage_events from anon, authenticated;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on table public.teacher_plans to authenticated;
grant select, insert, update, delete on table public.teacher_notes to authenticated;
grant select, insert, update, delete on table public.lesson_customizations to authenticated;
grant select, insert, update, delete on table public.source_documents to authenticated;
grant select on table public.source_pages to authenticated;
grant select on table public.source_chunks to authenticated;

-- Server-managed ingestion/index rows remain inaccessible for teacher writes.
revoke insert, update, delete on table public.source_pages from authenticated;
revoke insert, update, delete on table public.source_chunks from authenticated;

-- Enforce that every page/chunk owner is the same owner as its parent document,
-- even for trusted server-side inserts.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'source_documents_id_owner_unique'
  ) then
    alter table public.source_documents
      add constraint source_documents_id_owner_unique unique (id, owner_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'source_pages_document_owner_fk'
  ) then
    alter table public.source_pages
      add constraint source_pages_document_owner_fk
      foreign key (document_id, owner_id)
      references public.source_documents(id, owner_id)
      on delete cascade
      not valid;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'source_chunks_document_owner_fk'
  ) then
    alter table public.source_chunks
      add constraint source_chunks_document_owner_fk
      foreign key (document_id, owner_id)
      references public.source_documents(id, owner_id)
      on delete cascade
      not valid;
  end if;
end
$$;

-- New writes must respect product limits and owner-scoped storage paths.
-- NOT VALID avoids making this migration brittle because of any historical
-- beta row while still enforcing the constraint for all future rows.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'source_documents_product_limits_ck'
  ) then
    alter table public.source_documents
      add constraint source_documents_product_limits_ck
      check (
        size_bytes >= 0
        and size_bytes <= 26214400
        and (total_pages is null or (total_pages between 1 and 350))
        and (readable_pages is null or readable_pages >= 0)
        and (total_pages is null or readable_pages is null or readable_pages <= total_pages)
      ) not valid;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'source_documents_storage_owner_prefix_ck'
  ) then
    alter table public.source_documents
      add constraint source_documents_storage_owner_prefix_ck
      check (split_part(storage_path, '/', 1) = owner_id::text) not valid;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'source_chunks_page_range_ck'
  ) then
    alter table public.source_chunks
      add constraint source_chunks_page_range_ck
      check (page_start > 0 and page_end >= page_start and page_end <= 350) not valid;
  end if;
end
$$;

-- The private bucket stays private and keeps the same hard upload limits.
update storage.buckets
set
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = array['application/pdf']
where id = 'teacher-textbooks';

-- The vector matcher must never be callable anonymously.
revoke all on function public.match_private_textbook_chunks(vector, uuid, integer) from public, anon;
grant execute on function public.match_private_textbook_chunks(vector, uuid, integer) to authenticated;

commit;
