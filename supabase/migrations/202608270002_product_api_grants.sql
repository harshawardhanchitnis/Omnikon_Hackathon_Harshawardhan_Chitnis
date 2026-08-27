begin;

-- ChalkBox product Data API grants.
-- RLS policies decide which rows a signed-in teacher may access;
-- these GRANT statements expose only the operations required by the app.

grant usage on schema public to authenticated, service_role;

revoke all on table public.teacher_plans from anon;
revoke all on table public.teacher_notes from anon;
revoke all on table public.lesson_customizations from anon;
revoke all on table public.source_documents from anon;
revoke all on table public.source_pages from anon;
revoke all on table public.source_chunks from anon;
revoke all on table public.ai_usage_events from anon, authenticated;

grant select, insert, update, delete on table public.teacher_plans to authenticated;
grant select, insert, update, delete on table public.teacher_notes to authenticated;
grant select, insert, update, delete on table public.lesson_customizations to authenticated;
grant select, insert, update, delete on table public.source_documents to authenticated;
grant select on table public.source_pages to authenticated;
grant select on table public.source_chunks to authenticated;

grant select, insert, update, delete on table public.teacher_plans to service_role;
grant select, insert, update, delete on table public.teacher_notes to service_role;
grant select, insert, update, delete on table public.lesson_customizations to service_role;
grant select, insert, update, delete on table public.source_documents to service_role;
grant select, insert, update, delete on table public.source_pages to service_role;
grant select, insert, update, delete on table public.source_chunks to service_role;
grant select, insert, update, delete on table public.ai_usage_events to service_role;

grant usage, select on sequence public.source_pages_id_seq to service_role;
grant usage, select on sequence public.source_chunks_id_seq to service_role;
grant usage, select on sequence public.ai_usage_events_id_seq to service_role;

commit;
