-- RLS joins must not require browser roles to read private ownership columns.
create or replace function private.can_read_story(p_story_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.stories s
    where s.id = p_story_id
      and (
        (s.status = 'published' and s.visibility in ('public', 'unlisted'))
        or s.owner_id = (select auth.uid())
      )
  );
$$;

create or replace function private.can_manage_story(p_story_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.stories s
    where s.id = p_story_id
      and s.owner_id = (select auth.uid())
  );
$$;

revoke all on function private.can_read_story(text) from public, anon, authenticated;
revoke all on function private.can_manage_story(text) from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.can_read_story(text) to anon, authenticated;
grant execute on function private.can_manage_story(text) to authenticated;

drop policy if exists chapters_read_visible_stories on public.chapters;
create policy chapters_read_visible_stories on public.chapters for select to anon, authenticated
using (private.can_read_story(story_id));

drop policy if exists chapters_insert_own_story on public.chapters;
create policy chapters_insert_own_story on public.chapters for insert to authenticated
with check (private.can_manage_story(story_id));

drop policy if exists chapters_update_own_story on public.chapters;
create policy chapters_update_own_story on public.chapters for update to authenticated
using (private.can_manage_story(story_id))
with check (private.can_manage_story(story_id));

drop policy if exists chapters_delete_own_story on public.chapters;
create policy chapters_delete_own_story on public.chapters for delete to authenticated
using (private.can_manage_story(story_id));

drop policy if exists story_comments_delete_self_or_story_owner on public.story_comments;
create policy story_comments_delete_self_or_story_owner on public.story_comments for delete to authenticated
using (
  profile_id = (select auth.uid())::text
  or private.can_manage_story(story_id)
);
