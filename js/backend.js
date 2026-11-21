/**
 * Supabase data access for FableFlow.
 * Public catalog data is cached for the existing synchronous renderers. Personal
 * records are stored in Supabase for authenticated users and remain local for guests.
 */
window.FableFlow = window.FableFlow || {};

FableFlow.Backend = (function() {
  const LOCAL_KEYS = {
    bookmarks: 'fableflow_bookmarks',
    likes: 'fableflow_likes',
    progress: 'fableflow_reading_progress',
    follows: 'fableflow_follows',
    memberships: 'fableflow_memberships',
    dictionary: 'fableflow_user_dictionary',
    focus: 'fableflow_focus_sessions'
  };

  const cache = {
    profiles: [],
    stories: [],
    chapters: [],
    comments: [],
    guilds: [],
    messages: [],
    discussionPosts: [],
    challenges: [],
    bookmarks: new Set(),
    storyLikes: new Set(),
    readingProgress: [],
    follows: new Set(),
    memberships: new Set(),
    discussionLikes: new Set(),
    challengeIds: new Set(),
    dictionary: [],
    focusSessions: []
  };

  let client = null;

  function init() {
    const config = window.FableFlowSupabaseConfig;
    if (!window.supabase || !config?.url || !config?.publishableKey) {
      throw new Error('Supabase client configuration is missing.');
    }
    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  function isReady() {
    return !!client;
  }

  function getClient() {
    if (!client) throw new Error('Supabase is not initialized.');
    return client;
  }

  function currentUserId() {
    const user = window.FableFlow.Auth?.getCurrentUser();
    return user && !user.isGuest ? user.id : null;
  }

  function isRegisteredUser() {
    return !!currentUserId();
  }

  function readLocalArray(key, fallback = []) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (_) {
      return fallback;
    }
  }

  function writeLocalArray(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(String(value || ''), window.location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? escapeHtml(url.href) : '';
    } catch (_) {
      return '';
    }
  }

  function report(error, operation) {
    console.error(`FableFlow ${operation} failed:`, error);
    const banner = document.getElementById('backend-error-banner');
    if (banner) {
      banner.textContent = `Could not ${operation}. Please check your connection and try again.`;
      banner.style.display = 'block';
    }
    throw error;
  }

  function profileById(profileId) {
    return cache.profiles.find(profile => profile.id === profileId) || null;
  }

  function mapStory(row) {
    const author = profileById(row.author_id);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      coverImage: row.cover_image,
      authorId: row.author_id,
      authorName: author?.username || 'FableFlow Author',
      authorAvatar: author?.avatar_url || '',
      genre: row.genre,
      tags: row.tags || [],
      language: row.language,
      status: row.status,
      visibility: row.visibility,
      reads: Number(row.reads || 0),
      likes: Number(row.likes || 0),
      featured: row.featured,
      trending: row.trending,
      updatedAt: row.updated_at,
      createdAt: row.created_at
    };
  }

  function mapChapter(row) {
    return {
      id: row.id,
      storyId: row.story_id,
      chapterNumber: row.chapter_number,
      title: row.title,
      content: row.content,
      wordCount: row.word_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function mapComment(row) {
    const author = profileById(row.profile_id);
    return {
      id: row.id,
      storyId: row.story_id,
      username: author?.username || 'FableFlow Reader',
      avatar: author?.avatar_url || '',
      content: row.content,
      createdAt: row.created_at
    };
  }

  function mapMessage(row) {
    const author = profileById(row.profile_id);
    return {
      id: row.id,
      guildId: row.guild_id,
      profileId: row.profile_id,
      username: author?.username || 'FableFlow Reader',
      content: row.content,
      createdAt: row.created_at,
      time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  function mapDiscussion(row) {
    const author = profileById(row.profile_id);
    return {
      id: row.id,
      authorId: row.profile_id,
      author: author?.username || 'FableFlow Reader',
      title: row.title,
      content: row.content,
      likes: Number(row.likes || 0),
      commentsCount: Number(row.comments_count || 0),
      createdAt: row.created_at
    };
  }

  async function requireSuccess(result, operation) {
    if (result.error) report(result.error, operation);
    return result.data;
  }

  async function loadCatalog() {
    const db = getClient();
    const queries = await Promise.all([
      db.from('profiles').select('id,username,bio,avatar_url,created_at,updated_at').order('username'),
      db.from('stories').select('id,author_id,title,description,cover_image,genre,tags,language,status,visibility,reads,likes,featured,trending,created_at,updated_at').order('featured', { ascending: false }).order('trending', { ascending: false }).order('updated_at', { ascending: false }),
      db.from('chapters').select('id,story_id,chapter_number,title,content,word_count,created_at,updated_at').order('chapter_number'),
      db.from('story_comments').select('id,story_id,profile_id,content,created_at').order('created_at'),
      db.from('guilds').select('id,name,genre,description,cover_image,member_count,created_at').order('name'),
      db.from('guild_messages').select('id,guild_id,profile_id,content,created_at').order('created_at'),
      db.from('discussion_posts').select('id,profile_id,title,content,likes,comments_count,created_at,updated_at').order('created_at', { ascending: false }),
      db.from('writing_challenges').select('id,title,prompt,ends_at,participant_count').order('ends_at')
    ]);

    const labels = ['load profiles', 'load stories', 'load chapters', 'load comments', 'load guilds', 'load community messages', 'load discussions', 'load writing challenges'];
    queries.forEach((result, index) => {
      if (result.error) report(result.error, labels[index]);
    });

    cache.profiles = queries[0].data || [];
    cache.stories = (queries[1].data || []).map(mapStory);
    cache.chapters = (queries[2].data || []).map(mapChapter);
    cache.comments = (queries[3].data || []).map(mapComment);
    cache.guilds = (queries[4].data || []).map(row => ({
      id: row.id, name: row.name, genre: row.genre, description: row.description,
      coverImage: row.cover_image, memberCount: Number(row.member_count || 0)
    }));
    cache.messages = (queries[5].data || []).map(mapMessage);
    cache.discussionPosts = (queries[6].data || []).map(mapDiscussion);
    cache.challenges = (queries[7].data || []).map(row => ({
      id: row.id, title: row.title, prompt: row.prompt, endsAt: row.ends_at,
      participantCount: Number(row.participant_count || 0)
    }));
  }

  async function loadUserData() {
    const userId = currentUserId();
    if (!userId) {
      cache.bookmarks = new Set(readLocalArray(LOCAL_KEYS.bookmarks));
      cache.storyLikes = new Set(readLocalArray(LOCAL_KEYS.likes));
      cache.readingProgress = readLocalArray(LOCAL_KEYS.progress);
      cache.follows = new Set(readLocalArray(LOCAL_KEYS.follows));
      cache.memberships = new Set(readLocalArray(LOCAL_KEYS.memberships, ['comm_fantasy']));
      cache.discussionLikes = new Set();
      cache.challengeIds = new Set();
      cache.dictionary = readLocalArray(LOCAL_KEYS.dictionary);
      cache.focusSessions = readLocalArray(LOCAL_KEYS.focus);
      return;
    }

    const db = getClient();
    const queries = await Promise.all([
      db.from('story_bookmarks').select('story_id'),
      db.from('story_likes').select('story_id'),
      db.from('reading_progress').select('story_id,chapter_number,updated_at').order('updated_at', { ascending: false }),
      db.from('author_follows').select('followed_profile_id'),
      db.from('guild_memberships').select('guild_id'),
      db.from('discussion_likes').select('post_id'),
      db.from('challenge_participants').select('challenge_id'),
      db.from('dictionary_entries').select('id,word,meaning,example,created_at').order('created_at', { ascending: false }),
      db.from('focus_sessions').select('id,activity,duration,completed_at').order('completed_at', { ascending: false })
    ]);
    const labels = ['load bookmarks', 'load story likes', 'load reading progress', 'load author follows', 'load guild memberships', 'load discussion likes', 'load challenge participation', 'load dictionary', 'load focus sessions'];
    queries.forEach((result, index) => {
      if (result.error) report(result.error, labels[index]);
    });

    cache.bookmarks = new Set((queries[0].data || []).map(row => row.story_id));
    cache.storyLikes = new Set((queries[1].data || []).map(row => row.story_id));
    cache.readingProgress = (queries[2].data || []).map(row => ({ storyId: row.story_id, chapterNum: row.chapter_number, updatedAt: row.updated_at }));
    cache.follows = new Set((queries[3].data || []).map(row => row.followed_profile_id));
    cache.memberships = new Set((queries[4].data || []).map(row => row.guild_id));
    cache.discussionLikes = new Set((queries[5].data || []).map(row => row.post_id));
    cache.challengeIds = new Set((queries[6].data || []).map(row => row.challenge_id));
    cache.dictionary = (queries[7].data || []).map(row => ({ id: row.id, word: row.word, meaning: row.meaning, example: row.example, createdAt: row.created_at }));
    cache.focusSessions = (queries[8].data || []).map(row => ({ id: row.id, activity: row.activity, duration: row.duration, completedAt: row.completed_at }));
  }

  async function getProfile(userId) {
    const { data, error } = await getClient().from('profiles')
      .select('id,username,bio,avatar_url,created_at,updated_at').eq('id', userId).maybeSingle();
    if (error) report(error, 'load your profile');
    const { data: prefs, error: prefsError } = await getClient().from('user_preferences')
      .select('preferences').eq('user_id', userId).maybeSingle();
    if (prefsError) report(prefsError, 'load your accessibility preferences');
    return data ? {
      id: data.id,
      username: data.username,
      bio: data.bio,
      avatar: data.avatar_url,
      preferences: prefs?.preferences || {},
      createdAt: data.created_at
    } : null;
  }

  async function usernameAvailable(username) {
    const { data, error } = await getClient().from('profiles').select('username');
    if (error) report(error, 'check username');
    const requested = String(username || '').toLocaleLowerCase();
    return !(data || []).some(profile => profile.username.toLocaleLowerCase() === requested);
  }

  function getStories() { return cache.stories; }
  function getChapters(storyId) { return cache.chapters.filter(row => row.storyId === storyId).sort((a, b) => a.chapterNumber - b.chapterNumber); }
  function getComments(storyId) { return cache.comments.filter(row => row.storyId === storyId); }
  function getProfiles() { return cache.profiles; }
  function getGuilds() { return cache.guilds; }
  function getGuildMessages(guildId) { return cache.messages.filter(row => row.guildId === guildId); }
  function getDiscussionPosts() { return cache.discussionPosts; }
  function getChallenges() { return cache.challenges; }
  function getBookmarks() { return isRegisteredUser() ? [...cache.bookmarks] : readLocalArray(LOCAL_KEYS.bookmarks); }
  function getStoryLikes() { return isRegisteredUser() ? [...cache.storyLikes] : readLocalArray(LOCAL_KEYS.likes); }
  function getProgress() {
    if (!isRegisteredUser()) return readLocalArray(LOCAL_KEYS.progress, null);
    const recent = cache.readingProgress[0];
    return recent ? { storyId: recent.storyId, chapterNum: recent.chapterNum, updatedAt: recent.updatedAt } : null;
  }
  function getFollows() { return isRegisteredUser() ? [...cache.follows] : readLocalArray(LOCAL_KEYS.follows); }
  function getMemberships() { return isRegisteredUser() ? [...cache.memberships] : readLocalArray(LOCAL_KEYS.memberships, ['comm_fantasy']); }
  function getDiscussionLikes() { return [...cache.discussionLikes]; }
  function getChallengeIds() { return [...cache.challengeIds]; }
  function getDictionary() { return isRegisteredUser() ? cache.dictionary : readLocalArray(LOCAL_KEYS.dictionary); }
  function getFocusSessions() { return isRegisteredUser() ? cache.focusSessions : readLocalArray(LOCAL_KEYS.focus); }

  async function toggleCollection(table, column, value, set) {
    const db = getClient();
    const userId = currentUserId();
    const exists = set.has(value);
    let result;
    if (exists) {
      result = await db.from(table).delete().eq(column, value);
    } else {
      result = await db.from(table).insert({ [column]: value });
    }
    if (result.error) report(result.error, `update ${table.replaceAll('_', ' ')}`);
    if (exists) set.delete(value); else set.add(value);
    return !exists;
  }

  async function toggleBookmark(storyId) {
    if (!isRegisteredUser()) {
      const list = new Set(readLocalArray(LOCAL_KEYS.bookmarks));
      if (list.has(storyId)) list.delete(storyId); else list.add(storyId);
      writeLocalArray(LOCAL_KEYS.bookmarks, [...list]);
      cache.bookmarks = list;
      return list.has(storyId);
    }
    return toggleCollection('story_bookmarks', 'story_id', storyId, cache.bookmarks);
  }

  async function toggleStoryLike(storyId) {
    const story = cache.stories.find(row => row.id === storyId);
    if (!isRegisteredUser()) {
      const list = new Set(readLocalArray(LOCAL_KEYS.likes));
      const liked = list.has(storyId);
      if (liked) list.delete(storyId); else list.add(storyId);
      writeLocalArray(LOCAL_KEYS.likes, [...list]);
      cache.storyLikes = list;
      if (story) story.likes = Math.max(0, Number(story.likes || 0) + (liked ? -1 : 1));
      return { isLiked: !liked, likes: story?.likes || 0 };
    }
    const liked = cache.storyLikes.has(storyId);
    await toggleCollection('story_likes', 'story_id', storyId, cache.storyLikes);
    if (story) story.likes = Math.max(0, Number(story.likes || 0) + (liked ? -1 : 1));
    return { isLiked: !liked, likes: story?.likes || 0 };
  }

  async function toggleFollow(profileId) {
    if (!isRegisteredUser()) return false;
    return toggleCollection('author_follows', 'followed_profile_id', profileId, cache.follows);
  }

  async function toggleMembership(guildId) {
    if (!isRegisteredUser()) return false;
    const wasMember = cache.memberships.has(guildId);
    const joined = await toggleCollection('guild_memberships', 'guild_id', guildId, cache.memberships);
    const guild = cache.guilds.find(row => row.id === guildId);
    if (guild) guild.memberCount = Math.max(0, Number(guild.memberCount || 0) + (wasMember ? -1 : 1));
    return joined;
  }

  async function toggleDiscussionLike(postId) {
    if (!isRegisteredUser()) return false;
    const liked = cache.discussionLikes.has(postId);
    await toggleCollection('discussion_likes', 'post_id', postId, cache.discussionLikes);
    const post = cache.discussionPosts.find(row => row.id === postId);
    if (post) post.likes = Math.max(0, Number(post.likes || 0) + (liked ? -1 : 1));
    return !liked;
  }

  async function acceptChallenge(challengeId) {
    if (!isRegisteredUser()) return false;
    if (cache.challengeIds.has(challengeId)) return false;
    const { error } = await getClient().from('challenge_participants').insert({ challenge_id: challengeId });
    if (error) report(error, 'accept writing challenge');
    cache.challengeIds.add(challengeId);
    const challenge = cache.challenges.find(row => row.id === challengeId);
    if (challenge) challenge.participantCount = Number(challenge.participantCount || 0) + 1;
    return true;
  }

  async function saveProgress(storyId, chapterNum) {
    if (!isRegisteredUser()) {
      writeLocalArray(LOCAL_KEYS.progress, { storyId, chapterNum: Number(chapterNum), updatedAt: new Date().toISOString() });
      cache.readingProgress = [readLocalArray(LOCAL_KEYS.progress, null)];
      return;
    }
    const firstRead = !cache.readingProgress.some(row => row.storyId === storyId);
    const { error } = await getClient().from('reading_progress').upsert({ story_id: storyId, chapter_number: Number(chapterNum) }, { onConflict: 'user_id,story_id' });
    if (error) report(error, 'save reading progress');
    if (firstRead) {
      const story = cache.stories.find(row => row.id === storyId);
      if (story) story.reads = Number(story.reads || 0) + 1;
    }
    cache.readingProgress = [{ storyId, chapterNum: Number(chapterNum), updatedAt: new Date().toISOString() }, ...cache.readingProgress.filter(row => row.storyId !== storyId)]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  async function addComment(storyId, content) {
    const user = window.FableFlow.Auth?.getCurrentUser();
    if (!user || user.isGuest) throw new Error('Sign in to comment on stories.');
    const { data, error } = await getClient().from('story_comments')
      .insert({ story_id: storyId, profile_id: user.id, content }).select('id,story_id,profile_id,content,created_at').single();
    if (error) report(error, 'post comment');
    const comment = mapComment(data);
    cache.comments.push(comment);
    return comment;
  }

  async function saveStory(story, chapters) {
    const user = window.FableFlow.Auth?.getCurrentUser();
    if (!user || user.isGuest) throw new Error('Sign in to save stories.');
    const db = getClient();
    const content = {
      title: story.title,
      description: story.description || '',
      cover_image: story.coverImage || '',
      genre: story.genre || 'Fantasy',
      tags: story.tags || [],
      language: story.language || 'English',
      status: story.status || 'draft',
      visibility: story.visibility || 'public'
    };
    const existing = story.id && cache.stories.find(row => row.id === story.id && row.authorId === user.id);
    let storyResult;
    if (existing) {
      storyResult = await db.from('stories').update(content).eq('id', story.id).select('id').single();
    } else {
      storyResult = await db.from('stories').insert({ ...content, owner_id: user.id, author_id: user.id }).select('id').single();
    }
    if (storyResult.error) report(storyResult.error, 'save story');
    const storyId = storyResult.data.id;

    const chapterRows = chapters.map((chapter, index) => ({
      story_id: storyId,
      chapter_number: index + 1,
      title: chapter.title || `Chapter ${index + 1}`,
      content: chapter.content || '',
      word_count: Number(chapter.wordCount || 0)
    }));
    if (chapterRows.length) {
      const { error } = await db.from('chapters').upsert(chapterRows, { onConflict: 'story_id,chapter_number' });
      if (error) report(error, 'save story chapters');
      const numbers = chapterRows.map(row => row.chapter_number).join(',');
      const { error: removeError } = await db.from('chapters').delete().eq('story_id', storyId).not('chapter_number', 'in', `(${numbers})`);
      if (removeError) report(removeError, 'remove deleted chapters');
    } else {
      const { error } = await db.from('chapters').delete().eq('story_id', storyId);
      if (error) report(error, 'remove deleted chapters');
    }
    await loadCatalog();
    return storyId;
  }

  async function sendMessage(guildId, content) {
    const user = window.FableFlow.Auth?.getCurrentUser();
    if (!user || user.isGuest) throw new Error('Sign in to send a community message.');
    const { data, error } = await getClient().from('guild_messages')
      .insert({ guild_id: guildId, profile_id: user.id, content }).select('id,guild_id,profile_id,content,created_at').single();
    if (error) report(error, 'send community message');
    const message = mapMessage(data);
    cache.messages.push(message);
    return message;
  }

  async function addDiscussion(title, content) {
    const user = window.FableFlow.Auth?.getCurrentUser();
    if (!user || user.isGuest) throw new Error('Sign in to post a discussion.');
    const { data, error } = await getClient().from('discussion_posts')
      .insert({ profile_id: user.id, title, content }).select('id,profile_id,title,content,likes,comments_count,created_at,updated_at').single();
    if (error) report(error, 'post discussion');
    const post = mapDiscussion(data);
    cache.discussionPosts.unshift(post);
    return post;
  }

  async function addDictionaryEntry(word, meaning, example) {
    if (!isRegisteredUser()) {
      const list = readLocalArray(LOCAL_KEYS.dictionary);
      list.unshift({ id: `d_${Date.now()}`, word, meaning, example, createdAt: new Date().toISOString() });
      writeLocalArray(LOCAL_KEYS.dictionary, list);
      return list[0];
    }
    const { data, error } = await getClient().from('dictionary_entries')
      .insert({ word, meaning, example: example || '' }).select('id,word,meaning,example,created_at').single();
    if (error) report(error, 'save dictionary entry');
    const entry = { id: data.id, word: data.word, meaning: data.meaning, example: data.example, createdAt: data.created_at };
    cache.dictionary.unshift(entry);
    return entry;
  }

  async function deleteDictionaryEntry(id) {
    if (!isRegisteredUser()) {
      const list = readLocalArray(LOCAL_KEYS.dictionary).filter(entry => entry.id !== id);
      writeLocalArray(LOCAL_KEYS.dictionary, list);
      return;
    }
    const { error } = await getClient().from('dictionary_entries').delete().eq('id', id);
    if (error) report(error, 'delete dictionary entry');
    cache.dictionary = cache.dictionary.filter(entry => entry.id !== id);
  }

  async function saveFocusSession(activity, duration) {
    if (!isRegisteredUser()) {
      const list = readLocalArray(LOCAL_KEYS.focus);
      list.unshift({ id: `f_${Date.now()}`, activity, duration, completedAt: new Date().toISOString() });
      writeLocalArray(LOCAL_KEYS.focus, list);
      return;
    }
    const { data, error } = await getClient().from('focus_sessions')
      .insert({ activity, duration }).select('id,activity,duration,completed_at').single();
    if (error) report(error, 'save focus session');
    cache.focusSessions.unshift({ id: data.id, activity: data.activity, duration: data.duration, completedAt: data.completed_at });
  }

  async function savePreferences(preferences) {
    const userId = currentUserId();
    if (!userId) return;
    const { error } = await getClient().from('user_preferences').upsert({ user_id: userId, preferences }, { onConflict: 'user_id' });
    if (error) report(error, 'save accessibility preferences');
    const user = window.FableFlow.Auth?.getCurrentUser();
    if (user) user.preferences = { ...preferences };
  }

  return {
    init,
    isReady,
    getClient,
    isRegisteredUser,
    escapeHtml,
    safeHttpUrl,
    loadCatalog,
    loadUserData,
    getProfile,
    usernameAvailable,
    getStories,
    getChapters,
    getComments,
    getProfiles,
    getGuilds,
    getGuildMessages,
    getDiscussionPosts,
    getChallenges,
    getBookmarks,
    getStoryLikes,
    getProgress,
    getFollows,
    getMemberships,
    getDiscussionLikes,
    getChallengeIds,
    getDictionary,
    getFocusSessions,
    toggleBookmark,
    toggleStoryLike,
    toggleFollow,
    toggleMembership,
    toggleDiscussionLike,
    acceptChallenge,
    saveProgress,
    addComment,
    saveStory,
    sendMessage,
    addDiscussion,
    addDictionaryEntry,
    deleteDictionaryEntry,
    saveFocusSession,
    savePreferences
  };
})();
