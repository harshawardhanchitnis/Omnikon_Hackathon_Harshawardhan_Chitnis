begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

select has_table('public', 'plan_versions', 'plan versions table exists');
select has_table('public', 'share_snapshots', 'immutable share table exists');
select has_table('public', 'community_publications', 'moderated publication table exists');
select has_table('public', 'assessment_questions', 'assessment bank table exists');
select has_table('public', 'classroom_profiles', 'anonymous classroom profile table exists');
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  'teachers cannot update their role column'
);
select ok(
  not has_table_privilege('anon', 'public.share_snapshots', 'SELECT'),
  'anonymous visitors cannot enumerate immutable share snapshots'
);
select has_function('public', 'resolve_share_snapshot', array['text'], 'secure share resolver exists');
select ok(
  has_function_privilege('anon', 'public.resolve_share_snapshot(text)', 'EXECUTE'),
  'anonymous visitors can resolve only a raw capability token through the RPC'
);
select ok(
  not has_table_privilege('anon', 'public.lesson_plans', 'INSERT'),
  'anonymous visitors cannot create private lesson plans'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'community_publications_guard_transition' and not tgisinternal
  ),
  'publication transition guard prevents teacher self-approval'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'community_publications'
      and policyname = 'publications_owner_or_admin_update'
  ),
  'publication updates remain owner/admin scoped'
);

select * from finish();
rollback;
