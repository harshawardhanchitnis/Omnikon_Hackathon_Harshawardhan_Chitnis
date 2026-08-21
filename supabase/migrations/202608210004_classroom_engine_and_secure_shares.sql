-- ChalkBox v3: classroom-engine session state, Quick Check 2.0 and
-- capability-token sharing. Raw share tokens are never stored server-side.

alter table public.teaching_sessions
  add column if not exists current_block_index integer not null default 0 check (current_block_index >= 0),
  add column if not exists reveal_state jsonb not null default '{}'::jsonb,
  add column if not exists skipped_block_ids text[] not null default '{}',
  add column if not exists active_grade text check (active_grade is null or active_grade in ('1','2','3','4','5','6','7','8','9','10'));

alter table public.plan_versions drop constraint if exists plan_versions_reason_check;
alter table public.plan_versions
  add constraint plan_versions_reason_check
  check (reason in ('generated', 'manual-checkpoint', 'before-regeneration', 'accepted-regeneration', 'restored', 'published', 'shared'));

alter table public.quick_checks
  add column if not exists block_id text,
  add column if not exists misconception_signal text,
  add column if not exists suggested_action text;
alter table public.quick_checks drop constraint if exists quick_checks_mode_check;
alter table public.quick_checks
  add constraint quick_checks_mode_check
  check (mode in ('mcq', 'true-false', 'confidence', 'understanding'));

alter table public.share_snapshots add column if not exists token_hash text;
update public.share_snapshots
set token_hash = translate(
  rtrim(encode(extensions.digest(token, 'sha256'), 'base64'), '='),
  '+/', '-_'
)
where token_hash is null and token is not null;
alter table public.share_snapshots alter column token_hash set not null;
alter table public.share_snapshots add constraint share_snapshots_token_hash_unique unique (token_hash);

drop index if exists public.share_snapshots_active_token_idx;
create index share_snapshots_active_hash_idx
on public.share_snapshots(token_hash)
where revoked_at is null;

drop policy if exists "shares_owner_or_active_public_read" on public.share_snapshots;
create policy "shares_owner_or_admin_read" on public.share_snapshots
for select using (owner_id = auth.uid() or public.is_admin());

revoke all on public.share_snapshots from anon;
grant select on public.share_snapshots to authenticated;

create or replace function public.resolve_share_snapshot(raw_token text)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select snapshot
  from public.share_snapshots
  where token_hash = translate(
    rtrim(encode(digest(raw_token, 'sha256'), 'base64'), '='),
    '+/', '-_'
  )
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

revoke all on function public.resolve_share_snapshot(text) from public;
grant execute on function public.resolve_share_snapshot(text) to anon, authenticated;

alter table public.share_snapshots drop column token;

