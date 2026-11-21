-- FableFlow backend: Supabase Auth, public catalog, private user data, and RLS.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Supabase's automatic-RLS event trigger is project-owned. It must not be callable
-- as an RPC from the exposed public schema.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;

create table public.profiles (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 3 and 30 and username ~ '^[A-Za-z0-9._-]+$'),
  bio text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_ci_key on public.profiles (lower(username));

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.stories (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid references auth.users(id) on delete cascade,
  author_id text references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  cover_image text not null default '',
  genre text not null default 'Fantasy',
  tags text[] not null default '{}',
  language text not null default 'English',
  status text not null default 'draft' check (status in ('draft', 'published')),
  visibility text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  reads bigint not null default 0 check (reads >= 0),
  likes bigint not null default 0 check (likes >= 0),
  featured boolean not null default false,
  trending boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stories_owner_updated_idx on public.stories (owner_id, updated_at desc);
create index stories_public_discovery_idx on public.stories (status, visibility, featured, trending, updated_at desc);
create index stories_genre_idx on public.stories (genre);

create table public.chapters (
  id text primary key default gen_random_uuid()::text,
  story_id text not null references public.stories(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  title text not null default '',
  content text not null default '',
  word_count integer not null default 0 check (word_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, chapter_number)
);
create index chapters_story_order_idx on public.chapters (story_id, chapter_number);

create table public.story_comments (
  id text primary key default gen_random_uuid()::text,
  story_id text not null references public.stories(id) on delete cascade,
  profile_id text references public.profiles(id) on delete set null,
  content text not null check (char_length(content) between 1 and 3000),
  created_at timestamptz not null default now()
);
create index story_comments_story_created_idx on public.story_comments (story_id, created_at);

create table public.story_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  story_id text not null references public.stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

create table public.story_likes (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  story_id text not null references public.stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

create table public.reading_progress (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  story_id text not null references public.stories(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, story_id)
);
create index reading_progress_recent_idx on public.reading_progress (user_id, updated_at desc);

create table public.author_follows (
  follower_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  followed_profile_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_profile_id),
  check (follower_id::text <> followed_profile_id)
);

create table public.guilds (
  id text primary key,
  name text not null,
  genre text not null,
  description text not null default '',
  cover_image text not null default '',
  member_count bigint not null default 0 check (member_count >= 0),
  created_at timestamptz not null default now()
);

create table public.guild_memberships (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  guild_id text not null references public.guilds(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, guild_id)
);

create table public.guild_messages (
  id text primary key default gen_random_uuid()::text,
  guild_id text not null references public.guilds(id) on delete cascade,
  profile_id text references public.profiles(id) on delete set null,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index guild_messages_recent_idx on public.guild_messages (guild_id, created_at desc);

create table public.discussion_posts (
  id text primary key default gen_random_uuid()::text,
  profile_id text references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 180),
  content text not null check (char_length(content) between 1 and 10000),
  likes bigint not null default 0 check (likes >= 0),
  comments_count bigint not null default 0 check (comments_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index discussion_posts_recent_idx on public.discussion_posts (created_at desc);

create table public.discussion_likes (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  post_id text not null references public.discussion_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table public.writing_challenges (
  id text primary key,
  title text not null,
  prompt text not null,
  ends_at timestamptz,
  participant_count bigint not null default 0 check (participant_count >= 0)
);

create table public.challenge_participants (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  challenge_id text not null references public.writing_challenges(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

create table public.dictionary_entries (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  word text not null check (char_length(word) between 1 and 120),
  meaning text not null check (char_length(meaning) between 1 and 2000),
  example text not null default '',
  created_at timestamptz not null default now()
);
create index dictionary_entries_user_recent_idx on public.dictionary_entries (user_id, created_at desc);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  activity text not null default 'Writing',
  duration integer not null check (duration between 1 and 240),
  completed_at timestamptz not null default now()
);
create index focus_sessions_user_recent_idx on public.focus_sessions (user_id, completed_at desc);

-- Timestamp and sign-up profile triggers.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_username text;
begin
  chosen_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  if chosen_username is null then
    chosen_username := split_part(coalesce(new.email, 'reader'), '@', 1);
  end if;

  insert into public.profiles (id, auth_user_id, username, bio, avatar_url)
  values (
    new.id::text,
    new.id,
    chosen_username,
    coalesce(new.raw_user_meta_data ->> 'bio', 'Storywriter & passionate reader on FableFlow.'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  insert into public.user_preferences (user_id, preferences)
  values (new.id, coalesce(new.raw_user_meta_data -> 'preferences', '{}'::jsonb));
  return new;
end;
$$;

create or replace function private.sync_story_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.stories set likes = likes + 1 where id = new.story_id;
    return new;
  end if;
  update public.stories set likes = greatest(likes - 1, 0) where id = old.story_id;
  return old;
end;
$$;

create or replace function private.sync_discussion_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.discussion_posts set likes = likes + 1 where id = new.post_id;
    return new;
  end if;
  update public.discussion_posts set likes = greatest(likes - 1, 0) where id = old.post_id;
  return old;
end;
$$;

create or replace function private.sync_guild_member_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.guilds set member_count = member_count + 1 where id = new.guild_id;
    return new;
  end if;
  update public.guilds set member_count = greatest(member_count - 1, 0) where id = old.guild_id;
  return old;
end;
$$;

create or replace function private.sync_challenge_participant_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.writing_challenges set participant_count = participant_count + 1 where id = new.challenge_id;
    return new;
  end if;
  update public.writing_challenges set participant_count = greatest(participant_count - 1, 0) where id = old.challenge_id;
  return old;
end;
$$;

create or replace function private.sync_story_reader_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stories set reads = reads + 1 where id = new.story_id;
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function private.sync_story_like_count() from public, anon, authenticated;
revoke all on function private.sync_discussion_like_count() from public, anon, authenticated;
revoke all on function private.sync_guild_member_count() from public, anon, authenticated;
revoke all on function private.sync_challenge_participant_count() from public, anon, authenticated;
revoke all on function private.sync_story_reader_count() from public, anon, authenticated;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger user_preferences_set_updated_at before update on public.user_preferences
for each row execute function private.set_updated_at();
create trigger stories_set_updated_at before update on public.stories
for each row execute function private.set_updated_at();
create trigger chapters_set_updated_at before update on public.chapters
for each row execute function private.set_updated_at();
create trigger reading_progress_set_updated_at before update on public.reading_progress
for each row execute function private.set_updated_at();
create trigger discussion_posts_set_updated_at before update on public.discussion_posts
for each row execute function private.set_updated_at();
create trigger auth_user_create_profile after insert on auth.users
for each row execute function private.create_profile_for_auth_user();
create trigger story_likes_sync_count after insert or delete on public.story_likes
for each row execute function private.sync_story_like_count();
create trigger discussion_likes_sync_count after insert or delete on public.discussion_likes
for each row execute function private.sync_discussion_like_count();
create trigger guild_memberships_sync_count after insert or delete on public.guild_memberships
for each row execute function private.sync_guild_member_count();
create trigger challenge_participants_sync_count after insert or delete on public.challenge_participants
for each row execute function private.sync_challenge_participant_count();
create trigger reading_progress_sync_count after insert on public.reading_progress
for each row execute function private.sync_story_reader_count();

-- RLS is explicitly enabled as a safeguard even when project defaults enable it.
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.stories enable row level security;
alter table public.chapters enable row level security;
alter table public.story_comments enable row level security;
alter table public.story_bookmarks enable row level security;
alter table public.story_likes enable row level security;
alter table public.reading_progress enable row level security;
alter table public.author_follows enable row level security;
alter table public.guilds enable row level security;
alter table public.guild_memberships enable row level security;
alter table public.guild_messages enable row level security;
alter table public.discussion_posts enable row level security;
alter table public.discussion_likes enable row level security;
alter table public.writing_challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.dictionary_entries enable row level security;
alter table public.focus_sessions enable row level security;

create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_update_self on public.profiles for update to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));
create policy user_preferences_self on public.user_preferences for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy stories_read_published_or_owned on public.stories for select to anon, authenticated
using ((status = 'published' and visibility in ('public', 'unlisted')) or owner_id = (select auth.uid()));
create policy stories_insert_own on public.stories for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and author_id = (select auth.uid())::text
);
create policy stories_update_own on public.stories for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()) and author_id = (select auth.uid())::text);
create policy stories_delete_own on public.stories for delete to authenticated
using (owner_id = (select auth.uid()));

create policy chapters_read_visible_stories on public.chapters for select to anon, authenticated
using (exists (
  select 1 from public.stories s
  where s.id = story_id and (
    (s.status = 'published' and s.visibility in ('public', 'unlisted'))
    or s.owner_id = (select auth.uid())
  )
));
create policy chapters_insert_own_story on public.chapters for insert to authenticated
with check (exists (select 1 from public.stories s where s.id = story_id and s.owner_id = (select auth.uid())));
create policy chapters_update_own_story on public.chapters for update to authenticated
using (exists (select 1 from public.stories s where s.id = story_id and s.owner_id = (select auth.uid())))
with check (exists (select 1 from public.stories s where s.id = story_id and s.owner_id = (select auth.uid())));
create policy chapters_delete_own_story on public.chapters for delete to authenticated
using (exists (select 1 from public.stories s where s.id = story_id and s.owner_id = (select auth.uid())));

create policy story_comments_read_public on public.story_comments for select to anon, authenticated
using (exists (select 1 from public.stories s where s.id = story_id and s.status = 'published' and s.visibility in ('public', 'unlisted')));
create policy story_comments_insert_self on public.story_comments for insert to authenticated
with check (
  profile_id = (select auth.uid())::text
  and exists (select 1 from public.stories s where s.id = story_id and s.status = 'published' and s.visibility in ('public', 'unlisted'))
);
create policy story_comments_delete_self_or_story_owner on public.story_comments for delete to authenticated
using (
  profile_id = (select auth.uid())::text
  or exists (select 1 from public.stories s where s.id = story_id and s.owner_id = (select auth.uid()))
);

create policy bookmarks_self on public.story_bookmarks for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy story_likes_self on public.story_likes for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy reading_progress_self on public.reading_progress for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy follows_self on public.author_follows for all to authenticated
using (follower_id = (select auth.uid())) with check (follower_id = (select auth.uid()));

create policy guilds_public_read on public.guilds for select to anon, authenticated using (true);
create policy guild_memberships_self on public.guild_memberships for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy guild_messages_public_read on public.guild_messages for select to anon, authenticated using (true);
create policy guild_messages_insert_self on public.guild_messages for insert to authenticated
with check (profile_id = (select auth.uid())::text);

create policy discussion_posts_public_read on public.discussion_posts for select to anon, authenticated using (true);
create policy discussion_posts_insert_self on public.discussion_posts for insert to authenticated
with check (profile_id = (select auth.uid())::text);
create policy discussion_posts_update_self on public.discussion_posts for update to authenticated
using (profile_id = (select auth.uid())::text) with check (profile_id = (select auth.uid())::text);
create policy discussion_posts_delete_self on public.discussion_posts for delete to authenticated
using (profile_id = (select auth.uid())::text);
create policy discussion_likes_self on public.discussion_likes for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy challenges_public_read on public.writing_challenges for select to anon, authenticated using (true);
create policy challenge_participants_self on public.challenge_participants for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy dictionary_entries_self on public.dictionary_entries for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy focus_sessions_self on public.focus_sessions for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Explicit API grants: new tables are not exposed by default in this project.
grant usage on schema public to anon, authenticated;
grant select (id, username, bio, avatar_url, created_at, updated_at) on public.profiles to anon, authenticated;
grant update (username, bio, avatar_url) on public.profiles to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
grant select (id, author_id, title, description, cover_image, genre, tags, language, status, visibility, reads, likes, featured, trending, created_at, updated_at) on public.stories to anon, authenticated;
grant select on public.chapters, public.story_comments, public.guilds,
  public.guild_messages, public.discussion_posts, public.writing_challenges to anon, authenticated;
grant insert (owner_id, author_id, title, description, cover_image, genre, tags, language, status, visibility, featured, trending) on public.stories to authenticated;
grant update (title, description, cover_image, genre, tags, language, status, visibility, featured, trending) on public.stories to authenticated;
grant delete on public.stories to authenticated;
grant insert (story_id, chapter_number, title, content, word_count) on public.chapters to authenticated;
grant update (chapter_number, title, content, word_count) on public.chapters to authenticated;
grant delete on public.chapters to authenticated;
grant insert (story_id, profile_id, content) on public.story_comments to authenticated;
grant delete on public.story_comments to authenticated;
grant select, insert, delete on public.story_bookmarks, public.story_likes, public.author_follows,
  public.guild_memberships, public.discussion_likes, public.challenge_participants to authenticated;
grant insert (guild_id, profile_id, content) on public.guild_messages to authenticated;
grant insert (profile_id, title, content) on public.discussion_posts to authenticated;
grant update (title, content) on public.discussion_posts to authenticated;
grant delete on public.discussion_posts to authenticated;
grant select, insert, update, delete on public.reading_progress, public.dictionary_entries, public.focus_sessions to authenticated;

-- Public author and catalog records retain the existing FableFlow demo content.
insert into public.profiles (id, username, bio, avatar_url) values
  ('usr_author_1', 'ElenaVance', 'Fantasy author & mythmaker. Crafting worlds where starlight bends and ancient dragons remember.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'),
  ('usr_author_2', 'MarcusSterling', 'Cyberpunk & Sci-Fi dreamer. Obsessed with neural networks, neon alleys, and space opera.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80')
on conflict (id) do nothing;

insert into public.stories (id, author_id, title, description, cover_image, genre, tags, status, visibility, reads, likes, featured, trending, created_at, updated_at) values
  ('story_1', 'usr_author_1', 'Whispers of the Glass Citadel', 'When the celestial barrier shatters, a rogue cartographer discovers a tower forged of singing crystal—and a forgotten prince frozen at its summit.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80', 'Fantasy', array['Magic','Adventure','Mystery','CrystalSpire'], 'published', 'public', 34210, 2840, true, true, now() - interval '15 days', now() - interval '4 hours'),
  ('story_2', 'usr_author_2', 'Neon Synapse: Protocol Zero', 'In Neo-Kyoto 2184, detective Kaelen jacks into the memory of an assassinated synthetic idol, only to discover her thoughts are still broadcasting in his mind.', 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80', 'Science Fiction', array['Cyberpunk','AI','TechNoir','Dystopian'], 'published', 'public', 18940, 1720, true, true, now() - interval '20 days', now() - interval '12 hours'),
  ('story_3', 'usr_author_1', 'Letters to the Lavender Shore', 'A botanist restoring a lighthouse on the tempestuous coast finds sealed letters inside vintage apothecary jars—each dated from years into the future.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', 'Romance', array['SweetRomance','TimeSlip','Cozy','Lighthouse'], 'published', 'public', 42100, 3890, false, true, now() - interval '30 days', now() - interval '2 hours'),
  ('story_4', 'usr_author_1', 'The Shadow of Blackwood Manor', 'An estranged heiress arrives to claim an estate shrouded in midnight fog, unaware that the portraits on the grand staircase swap gazes when no one is watching.', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80', 'Horror', array['Gothic','Haunted','Mystery'], 'published', 'public', 15300, 1210, false, false, now() - interval '25 days', now() - interval '3 days'),
  ('story_5', 'usr_author_1', 'Starlight & Spindles', 'A collection of haunting poetic vignettes mapping the constellation of lost loves, quiet coffee shops, and the rhythm of rain against midnight train windows.', 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=600&q=80', 'Poetry', array['Verse','Melancholy','Reflective'], 'published', 'public', 8900, 920, false, false, now() - interval '10 days', now() - interval '1 day'),
  ('story_6', 'usr_author_2', 'The Alchemist of Clockwork Spire', 'To save his brother from an alchemical curse, young apprentice Lucian must steal the chronometer heart of the emperor’s clockwork chimera.', 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=600&q=80', 'Adventure', array['Steampunk','Alchemy','Heist'], 'published', 'public', 22100, 1980, true, false, now() - interval '40 days', now() - interval '2 days')
on conflict (id) do nothing;

insert into public.chapters (id, story_id, chapter_number, title, content, word_count, created_at) values
  ('chap_1_1', 'story_1', 1, 'Chapter 1: The Singing Fractures', 'The sky over the Pale Wastes had not always sung. In the old cartographer guilds, apprentices were taught that silence was the natural state of heavens. But on the seventeenth eve of the Equinox, the sky cracked like thin blown sugar, and the melodies poured through.\n\nLyra tightened the brass straps of her altitude compass. The wind was bitter, tasting faintly of ozonated copper and crushed mint. Beneath her snow-crampons, the glass shelf hummed with an undulating frequency that made her molars ache.\n\nAhead of them, rising from the fog like a colossal shard of fallen moon, stood the Glass Citadel. It was crystallized starlight, hollowed into spirals of soaring colonnades and slender sky-bridges that defied earthly gravity. Every story begins with an idea. Sometimes it takes courage to turn that idea into words. But every word brings a new world to life.', 104, now() - interval '15 days'),
  ('chap_1_2', 'story_1', 2, 'Chapter 2: The Chamber of Frozen Stars', 'Inside the grand nave, silence returned with suffocating density. The vaulted ceiling rose so high that miniature frost clouds had formed in the upper eaves, drifting lazily past chandeliers carved from intact meteorites. Lyra stepped onto the tessellated floor. Beneath the translucent tiles, constellations swam like schools of glowing minnows.\n\nThere, encased in a monolith of unbroken obsidian-ice, knelt the Prince of the Solstice. A silver circlet bound his temple, bearing the insignia of the Seventh Dominion—a dynasty thought eradicated six centuries prior.\n\n“So the rumors were true,” Lyra breathed. “The seventh dynasty didn’t fall to war. They froze time itself to hide from what was hunting them.”', 95, now() - interval '10 days'),
  ('chap_2_1', 'story_2', 1, 'Act I: The Blue Neon Rain', 'Rain in District 9 had a habit of dissolving synthetic leather if you stayed out long enough without an umbrella. Kaelen pulled the collar of his thermal trench coat tighter around his cybernetic throat and watched the holo-billboards flicker across the drenched skybridge.\n\n“Detective,” his neural link chimed. It was the synthetic voice of Iris, his handler at Precinct 14. “The autopsy on Idol 404 is complete. Her memory core has been extracted, but our firewalls can’t unpack the encryption.”\n\nHe didn’t hesitate. With a mental flick of his optic switch, he opened the data stream. Darkness washed over him, followed by the blinding neon pink of a concert arena, twenty thousand screaming fans, and then—a gunshot that sounded like shattering porcelain.', 94, now() - interval '20 days'),
  ('chap_3_1', 'story_3', 1, 'Chapter 1: The Tide and the Bottle', 'Old Man Callahan used to say that the Atlantic didn’t just carry driftwood; it carried regrets that people were too cowardly to bury on land.\n\nMaya had come to Cape Sorrow looking for quiet. Her grandfather’s lighthouse had stood abandoned for fifteen winters, its whitewashed brick peeling in long strips like sunburned skin. She found the first jar on Tuesday morning, wedged between two barnacle-crusted granite boulders near the low-tide mark. Inside rested a roll of parchment tied with silk.\n\nWhen she broke the wax and unfurled the leaf, her own handwriting stared back at her: “Maya, do not light the beacon on the night of the solar eclipse. He is coming, and he knows your name.” The date stamped at the bottom was three years from today.', 106, now() - interval '30 days')
on conflict (id) do nothing;

insert into public.story_comments (id, story_id, profile_id, content, created_at) values
  ('cmt_1', 'story_1', 'usr_author_2', 'The imagery of “sky cracked like thin blown sugar” is breathtaking! The sensory details immediately hooked me.', now() - interval '2 days'),
  ('cmt_2', 'story_1', 'usr_author_1', 'Thank you Marcus! The frost clouds and Gideon the gyrfalcon were inspired by an old Nordic folk myth.', now() - interval '1 day')
on conflict (id) do nothing;

insert into public.guilds (id, name, genre, description, cover_image, member_count) values
  ('comm_fantasy', 'Fantasy Worldbuilders', 'Fantasy', 'For novelists shaping intricate magic systems, high epic adventures, and legendary creatures.', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80', 3840),
  ('comm_scifi', 'Cyberpunk & Sci-Fi Forge', 'Science Fiction', 'Hard sci-fi, space opera, cyberpunk aesthetics, and AI co-writing discussions.', 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80', 2610),
  ('comm_romance', 'The Romance Guild', 'Romance', 'Enemies-to-lovers, slow burns, cozy fiction, and romantic dialogue workshops.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', 5200),
  ('comm_writers_block', 'The Midnight Quill Cafe', 'Writing Advice', 'Overcoming writer’s block, sprint marathons, writing accountability, and daily creative prompts.', 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80', 6150)
on conflict (id) do nothing;

insert into public.guild_messages (id, guild_id, profile_id, content, created_at) values
  ('m1', 'comm_fantasy', 'usr_author_1', 'Welcome everyone to the Fantasy Worldbuilders lounge! Today we are discussing hard vs soft magic limits.', now() - interval '1 day'),
  ('m2', 'comm_fantasy', 'usr_author_2', 'Limitations make characters work harder for their victories. Boundless magic kills tension.', now() - interval '23 hours')
on conflict (id) do nothing;

insert into public.discussion_posts (id, profile_id, title, content, likes, comments_count) values
  ('p1', 'usr_author_1', 'How do you balance high magical stakes with quiet character moments?', 'I find that slowing down during campfire scenes lets readers emotionally catch up with big battles.', 42, 16),
  ('p2', 'usr_author_2', 'Speculative tech: What if synthetic memories could be forged into glass currency?', 'A currency where you literally trade your happiest childhood day for a week of rations.', 31, 9)
on conflict (id) do nothing;

insert into public.writing_challenges (id, title, prompt, ends_at, participant_count) values
  ('singing-relic', '500-Word Midnight Prompt: The Singing Relic', 'Your protagonist discovers an ancient artifact that hums whenever someone tells a lie in its presence. Write a 500-word scene at a royal banquet.', now() + interval '3 days', 142),
  ('train-delayed', 'Dialogue-Only Flash Fiction: The Train Delayed', 'Two former rivals find themselves trapped on a delayed midnight commuter train. Tell their entire history and reconciliation using only dialogue.', now() + interval '5 days', 89)
on conflict (id) do nothing;
