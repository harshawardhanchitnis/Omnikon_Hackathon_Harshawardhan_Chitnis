-- ============================================================
-- ChalkBox
-- Fix Class 10 textbook source filenames
-- ============================================================

begin;

update public.textbook_lessons
set
  source_file_name = 'NCERT-Class-10-Life-Processes-official.pdf',
  updated_at = now()
where lesson_key = 'class-10-life-processes';

update public.textbook_lessons
set
  source_file_name = 'NCERT-Class-10-Electricity-official.pdf',
  updated_at = now()
where lesson_key = 'class-10-electricity';

-- Fail loudly if either seeded lesson is missing.
do $$
declare
  matched_count integer;
begin
  select count(*)
  into matched_count
  from public.textbook_lessons
  where lesson_key in (
    'class-10-life-processes',
    'class-10-electricity'
  )
  and source_file_name in (
    'NCERT-Class-10-Life-Processes-official.pdf',
    'NCERT-Class-10-Electricity-official.pdf'
  );

  if matched_count <> 2 then
    raise exception
      'Expected both Class 10 textbook lesson rows to exist and be updated; found %',
      matched_count;
  end if;
end
$$;

commit;

select
  lesson_key,
  title,
  source_file_name
from public.textbook_lessons
where lesson_key in (
  'class-10-life-processes',
  'class-10-electricity'
)
order by lesson_key;