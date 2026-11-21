-- Index foreign-key columns used for joins, cascades, and cleanup.
create index author_follows_followed_profile_idx on public.author_follows (followed_profile_id);
create index challenge_participants_challenge_idx on public.challenge_participants (challenge_id);
create index discussion_likes_post_idx on public.discussion_likes (post_id);
create index discussion_posts_profile_idx on public.discussion_posts (profile_id);
create index guild_memberships_guild_idx on public.guild_memberships (guild_id);
create index guild_messages_profile_idx on public.guild_messages (profile_id);
create index reading_progress_story_idx on public.reading_progress (story_id);
create index stories_author_idx on public.stories (author_id);
create index story_bookmarks_story_idx on public.story_bookmarks (story_id);
create index story_comments_profile_idx on public.story_comments (profile_id);
create index story_likes_story_idx on public.story_likes (story_id);
