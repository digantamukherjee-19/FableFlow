/**
 * FableFlow Stories, Reading Experience & Wattpad Discovery
 * Manages story data, chapters, book cards, bookmarks, likes, comments, and the distraction-free reader.
 */

window.FableFlow = window.FableFlow || {};

FableFlow.Stories = (function() {
  const STORIES_KEY = 'fableflow_stories';
  const CHAPTERS_KEY = 'fableflow_chapters';
  const BOOKMARKS_KEY = 'fableflow_bookmarks';
  const LIKES_KEY = 'fableflow_likes';
  const PROGRESS_KEY = 'fableflow_reading_progress';
  const COMMENTS_KEY = 'fableflow_comments';
  const FOLLOWS_KEY = 'fableflow_follows';

  const GENRES = [
    'All',
    'Romance',
    'Fantasy',
    'Mystery',
    'Thriller',
    'Horror',
    'Science Fiction',
    'Adventure',
    'Poetry',
    'Drama',
    'Fanfiction'
  ];

  let selectedGenre = 'All';
  let searchQuery = '';

  function escapeHtml(value) {
    return FableFlow.Backend?.escapeHtml ? FableFlow.Backend.escapeHtml(value) : String(value ?? '');
  }

  function safeImageUrl(value) {
    return FableFlow.Backend?.safeHttpUrl ? FableFlow.Backend.safeHttpUrl(value) : escapeHtml(value);
  }

  function init() {
    bindHomeEvents();
    bindReaderEvents();
  }

  function initDefaultData() {
    if (!localStorage.getItem(STORIES_KEY)) {
      const defaultStories = [
        {
          id: 'story_1',
          title: 'Whispers of the Glass Citadel',
          description: 'When the celestial barrier shatters, a rogue cartographer discovers a tower forged of singing crystal—and a forgotten prince frozen at its summit.',
          coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
          authorId: 'usr_author_1',
          authorName: 'ElenaVance',
          authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          genre: 'Fantasy',
          tags: ['Magic', 'Adventure', 'Mystery', 'CrystalSpire'],
          language: 'English',
          status: 'published',
          visibility: 'public',
          reads: 34210,
          likes: 2840,
          featured: true,
          trending: true,
          updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          createdAt: new Date(Date.now() - 86400000 * 15).toISOString()
        },
        {
          id: 'story_2',
          title: 'Neon Synapse: Protocol Zero',
          description: 'In Neo-Kyoto 2184, detective Kaelen jacks into the memory of an assassinated synthetic idol, only to discover her thoughts are still broadcasting in his mind.',
          coverImage: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80',
          authorId: 'usr_author_2',
          authorName: 'MarcusSterling',
          authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
          genre: 'Science Fiction',
          tags: ['Cyberpunk', 'AI', 'TechNoir', 'Dystopian'],
          language: 'English',
          status: 'published',
          visibility: 'public',
          reads: 18940,
          likes: 1720,
          featured: true,
          trending: true,
          updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
          createdAt: new Date(Date.now() - 86400000 * 20).toISOString()
        },
        {
          id: 'story_3',
          title: 'Letters to the Lavender Shore',
          description: 'A botanist restoring a lighthouse on the tempestuous coast finds sealed letters inside vintage apothecary jars—each dated from years into the future.',
          coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
          authorId: 'usr_author_1',
          authorName: 'ElenaVance',
          authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          genre: 'Romance',
          tags: ['SweetRomance', 'TimeSlip', 'Cozy', 'Lighthouse'],
          language: 'English',
          status: 'published',
          visibility: 'public',
          reads: 42100,
          likes: 3890,
          featured: false,
          trending: true,
          updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          createdAt: new Date(Date.now() - 86400000 * 30).toISOString()
        },
        {
          id: 'story_4',
          title: 'The Shadow of Blackwood Manor',
          description: 'An estranged heiress arrives to claim an estate shrouded in midnight fog, unaware that the portraits on the grand staircase swap gazes when no one is watching.',
          coverImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
          authorId: 'usr_author_1',
          authorName: 'ElenaVance',
          authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          genre: 'Horror',
          tags: ['Gothic', 'Haunted', 'Mystery'],
          language: 'English',
          status: 'published',
          visibility: 'public',
          reads: 15300,
          likes: 1210,
          featured: false,
          trending: false,
          updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          createdAt: new Date(Date.now() - 86400000 * 25).toISOString()
        },
        {
          id: 'story_5',
          title: 'Starlight & Spindles',
          description: 'A collection of haunting poetic vignettes mapping the constellation of lost loves, quiet coffee shops, and the rhythm of rain against midnight train windows.',
          coverImage: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=600&q=80',
          authorId: 'usr_author_1',
          authorName: 'ElenaVance',
          authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          genre: 'Poetry',
          tags: ['Verse', 'Melancholy', 'Reflective'],
          language: 'English',
          status: 'published',
          visibility: 'public',
          reads: 8900,
          likes: 920,
          featured: false,
          trending: false,
          updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
        },
        {
          id: 'story_6',
          title: 'The Alchemist of Clockwork Spire',
          description: 'To save his brother from an alchemical curse, young apprentice Lucian must steal the chronometer heart of the emperor’s clockwork chimera.',
          coverImage: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=600&q=80',
          authorId: 'usr_author_2',
          authorName: 'MarcusSterling',
          authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
          genre: 'Adventure',
          tags: ['Steampunk', 'Alchemy', 'Heist'],
          language: 'English',
          status: 'published',
          visibility: 'public',
          reads: 22100,
          likes: 1980,
          featured: true,
          trending: false,
          updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          createdAt: new Date(Date.now() - 86400000 * 40).toISOString()
        }
      ];
      localStorage.setItem(STORIES_KEY, JSON.stringify(defaultStories));

      // Chapters
      const defaultChapters = [
        {
          id: 'chap_1_1',
          storyId: 'story_1',
          chapterNumber: 1,
          title: 'Chapter 1: The Singing Fractures',
          content: `The sky over the Pale Wastes had not always sung. In the old cartographer guilds, apprentices were taught that silence was the natural state of heavens. But on the seventeenth eve of the Equinox, the sky cracked like thin blown sugar, and the melodies poured through.

Lyra tightened the brass straps of her altitude compass. The wind was bitter, tasting faintly of ozonated copper and crushed mint. Beneath her snow-crampons, the glass shelf hummed with an undulating frequency that made her molars ache.

"Hold steady, Gideon," she murmured to the mechanical gyrfalcon perched on her shoulder. The brass bird clicked its shuttered optical lens, whirring in twin brass gears. "If the triangulation is off by even half a degree, we plunge into the Mist Rift."

Ahead of them, rising from the fog like a colossal shard of fallen moon, stood the Glass Citadel. It was neither stone nor glacier. It was crystallized starlight, hollowed into spirals of soaring colonnades and slender sky-bridges that defied earthly gravity.

Every story begins with an idea. Sometimes it takes courage to turn that idea into words. But every word brings a new world to life.

As Lyra placed her gloved hand against the crystalline gate, the cold did not bite. Instead, a surge of warmth rushed along her forearm, leaving a trail of luminescent glyphs that matched the birthmark etched upon her collarbone. The citadel was not waking to her presence.

It had been waiting for her return.`,
          wordCount: 245,
          reads: 34210,
          createdAt: new Date(Date.now() - 86400000 * 15).toISOString()
        },
        {
          id: 'chap_1_2',
          storyId: 'story_1',
          chapterNumber: 2,
          title: 'Chapter 2: The Chamber of Frozen Stars',
          content: `Inside the grand nave, silence returned with suffocating density. 

The vaulted ceiling rose so high that miniature frost clouds had formed in the upper eaves, drifting lazily past chandeliers carved from intact meteorites. Lyra stepped onto the tessellated floor. Beneath the translucent tiles, constellations swam like schools of glowing minnows.

"Scan the perimeter," she whispered.

Gideon spread his brass wings with a sharp snap of oiled springs and lifted into the frigid air. His optical sensors cast a pale amber grid over the central dais. 

There, encased in a monolith of unbroken obsidian-ice, knelt the Prince of the Solstice.

His eyes were closed, dark lashes frosted with fine diamond dust. A silver circlet bound his temple, bearing the insignia of the Seventh Dominion—a dynasty thought eradicated six centuries prior. In his clasped hands, he held a key wrought from pure dark-matter filament.

"So the rumors were true," Lyra breathed, her breath puffing in clouds of white steam. "The seventh dynasty didn't fall to war. They froze time itself to hide from what was hunting them."`,
          wordCount: 182,
          reads: 29800,
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
        },
        {
          id: 'chap_2_1',
          storyId: 'story_2',
          chapterNumber: 1,
          title: 'Act I: The Blue Neon Rain',
          content: `Rain in District 9 had a habit of dissolving synthetic leather if you stayed out long enough without an umbrella. Kaelen pulled the collar of his thermal trench coat tighter around his cybernetic throat and watched the holo-billboards flicker across the drenched skybridge.

"Detective," his neural link chimed. It was the synthetic voice of Iris, his handler at Precinct 14. "The autopsy on Idol 404 is complete. Her memory core has been extracted, but our firewalls can't unpack the encryption."

"Send it to my ocular deck," Kaelen replied, spitting a mouthful of synthetic rain onto the grated catwalk.

"Warning: the neural packet contains sensory feedback loops. If you experience synaptic vertigo, disconnect immediately."

He didn't hesitate. With a mental flick of his optic switch, he opened the data stream. Darkness washed over him, followed by the blinding neon pink of a concert arena, twenty thousand screaming fans, and then—a gunshot that sounded like shattering porcelain.`,
          wordCount: 162,
          reads: 18940,
          createdAt: new Date(Date.now() - 86400000 * 20).toISOString()
        },
        {
          id: 'chap_3_1',
          storyId: 'story_3',
          chapterNumber: 1,
          title: 'Chapter 1: The Tide and the Bottle',
          content: `Old Man Callahan used to say that the Atlantic didn't just carry driftwood; it carried regrets that people were too cowardly to bury on land.

Maya had come to Cape Sorrow looking for quiet. Her grandfather's lighthouse had stood abandoned for fifteen winters, its whitewashed brick peeling in long strips like sunburned skin. She had brought three boxes of botanical specimens, a brass kettle, and enough loose-leaf peppermint tea to outlast a hurricane.

She found the first jar on Tuesday morning.

It was wedged between two barnacle-crusted granite boulders near the low-tide mark. An apothecary bottle of heavy cobalt glass, sealed with dripping beeswax stamped with an intricate swallowtail moth. Inside rested a roll of parchment tied with silk.

When she broke the wax and unfurled the leaf, her own handwriting stared back at her:

'Maya, do not light the beacon on the night of the solar eclipse. He is coming, and he knows your name.'

The date stamped at the bottom was three years from today.`,
          wordCount: 178,
          reads: 42100,
          createdAt: new Date(Date.now() - 86400000 * 30).toISOString()
        }
      ];
      localStorage.setItem(CHAPTERS_KEY, JSON.stringify(defaultChapters));

      // Comments
      const defaultComments = [
        {
          id: 'cmt_1',
          storyId: 'story_1',
          username: 'MarcusSterling',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
          content: 'The imagery of "sky cracked like thin blown sugar" is breathtaking! The sensory details immediately hooked me.',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        },
        {
          id: 'cmt_2',
          storyId: 'story_1',
          username: 'ElenaVance',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          content: 'Thank you Marcus! The frost clouds and Gideon the gyrfalcon were inspired by an old Nordic folk myth.',
          createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
        }
      ];
      localStorage.setItem(COMMENTS_KEY, JSON.stringify(defaultComments));
    }
  }

  function getStories() {
    if (FableFlow.Backend?.isReady()) return FableFlow.Backend.getStories();
    try {
      return JSON.parse(localStorage.getItem(STORIES_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function getChapters(storyId) {
    if (FableFlow.Backend?.isReady()) return FableFlow.Backend.getChapters(storyId);
    try {
      const all = JSON.parse(localStorage.getItem(CHAPTERS_KEY) || '[]');
      return all.filter(c => c.storyId === storyId).sort((a, b) => a.chapterNumber - b.chapterNumber);
    } catch (e) {
      return [];
    }
  }

  function getBookmarks() {
    if (FableFlow.Backend?.isReady()) return FableFlow.Backend.getBookmarks();
    try {
      return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function isBookmarked(storyId) {
    const list = getBookmarks();
    return list.includes(storyId);
  }

  async function toggleBookmark(storyId) {
    if (FableFlow.Backend?.isReady()) {
      try {
        const saved = await FableFlow.Backend.toggleBookmark(storyId);
        renderHome();
        return saved;
      } catch (error) {
        console.error('Could not save bookmark', error);
        return false;
      }
    }
    let list = getBookmarks();
    if (list.includes(storyId)) {
      list = list.filter(id => id !== storyId);
    } else {
      list.push(storyId);
    }
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    renderHome();
    return list.includes(storyId);
  }

  function getLikes() {
    if (FableFlow.Backend?.isReady()) return FableFlow.Backend.getStoryLikes();
    try {
      return JSON.parse(localStorage.getItem(LIKES_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function isLiked(storyId) {
    return getLikes().includes(storyId);
  }

  async function toggleLike(storyId) {
    if (FableFlow.Backend?.isReady()) return FableFlow.Backend.toggleStoryLike(storyId);
    let list = getLikes();
    const stories = getStories();
    const story = stories.find(s => s.id === storyId);

    if (list.includes(storyId)) {
      list = list.filter(id => id !== storyId);
      if (story) story.likes = Math.max(0, (story.likes || 1) - 1);
    } else {
      list.push(storyId);
      if (story) story.likes = (story.likes || 0) + 1;
    }

    localStorage.setItem(LIKES_KEY, JSON.stringify(list));
    localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
    return { isLiked: list.includes(storyId), likes: story?.likes || 0 };
  }

  function saveReadingProgress(storyId, chapterNum) {
    if (FableFlow.Backend?.isReady()) {
      FableFlow.Backend.saveProgress(storyId, chapterNum).catch(error => console.error('Could not save reading progress', error));
      return;
    }
    try {
      const progress = {
        storyId,
        chapterNum: Number(chapterNum),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {}
  }

  function getReadingProgress() {
    if (FableFlow.Backend?.isReady()) return FableFlow.Backend.getProgress();
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Render Story Card HTML
  function renderBookCard(story) {
    const bookmarked = isBookmarked(story.id);
    const liked = isLiked(story.id);

    return `
      <div class="book-card" onclick="FableFlow.Navigation.navigateTo('story-detail', { id: '${story.id}' })">
        <div class="book-cover-wrap">
          <img src="${safeImageUrl(story.coverImage)}" alt="${escapeHtml(story.title)}" class="book-cover-img" loading="lazy" />
          <div class="book-overlay-gradient"></div>
          <span class="book-genre-badge">${escapeHtml(story.genre)}</span>
          <button class="book-bookmark-btn ${bookmarked ? 'bookmarked' : ''}" 
                  onclick="event.stopPropagation(); FableFlow.Stories.toggleBookmark('${story.id}')"
                  title="${bookmarked ? 'Remove Bookmark' : 'Add to Bookmarks'}">
            🔖
          </button>
          <div class="book-stats-float">
            <span>👁️ ${(story.reads || 0).toLocaleString()}</span>
            <span>❤️ ${story.likes || 0}</span>
          </div>
        </div>
        <div class="book-card-body">
          <h4 class="book-card-title">${escapeHtml(story.title)}</h4>
          <p class="book-card-author">by ${escapeHtml(story.authorName)}</p>
          <p class="book-card-desc">${escapeHtml(story.description)}</p>
        </div>
      </div>
    `;
  }

  // Render Home Page
  function renderHome() {
    const stories = getStories();

    // 1. Continue reading banner
    const contProg = getReadingProgress();
    const contCard = document.getElementById('home-continue-reading-card');
    if (contCard) {
      if (contProg && stories.some(s => s.id === contProg.storyId)) {
        const cStory = stories.find(s => s.id === contProg.storyId);
        contCard.style.display = 'flex';
        contCard.innerHTML = `
          <div class="continue-reading-left">
            <img src="${safeImageUrl(cStory.coverImage)}" class="continue-reading-cover" alt="${escapeHtml(cStory.title)}" />
            <div class="continue-reading-meta">
              <span class="continue-reading-tag">Continue Reading • Chapter ${contProg.chapterNum}</span>
              <h4 class="continue-reading-title">${escapeHtml(cStory.title)}</h4>
              <p class="continue-reading-author">by ${escapeHtml(cStory.authorName)}</p>
            </div>
          </div>
          <button class="btn-primary continue-reading-btn" onclick="FableFlow.Navigation.navigateTo('story-reader', { id: '${cStory.id}', ch: ${contProg.chapterNum} })">
            ▶ Resume Reading
          </button>
        `;
      } else {
        contCard.style.display = 'none';
      }
    }

    // 2. Genre Pills
    const genreContainer = document.getElementById('home-genre-pills');
    if (genreContainer) {
      genreContainer.innerHTML = GENRES.map(g => `
        <button class="genre-pill ${selectedGenre === g ? 'active' : ''}" 
                onclick="FableFlow.Stories.setFilterGenre('${g}')">
          ${g}
        </button>
      `).join('');
    }

    // 3. Filtered Stories Grid
    let filtered = stories;
    if (selectedGenre !== 'All') {
      filtered = filtered.filter(s => s.genre.toLowerCase() === selectedGenre.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.authorName.toLowerCase().includes(q) ||
        (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    const grid = document.getElementById('home-stories-grid');
    if (grid) {
      if (filtered.length > 0) {
        grid.innerHTML = filtered.map(renderBookCard).join('');
      } else {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--text-muted);">
            <p style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">No stories found matching "${searchQuery || selectedGenre}"</p>
            <p style="font-size: 0.85rem; margin-top: 6px;">Try adjusting your search terms or be the first to create one!</p>
          </div>
        `;
      }
    }

    // 4. Featured Stories
    const featGrid = document.getElementById('home-featured-grid');
    if (featGrid) {
      const featured = stories.filter(s => s.featured);
      featGrid.innerHTML = featured.map(renderBookCard).join('');
    }

    // 5. Trending Stories
    const trendGrid = document.getElementById('home-trending-grid');
    if (trendGrid) {
      const trending = stories.filter(s => s.trending);
      trendGrid.innerHTML = trending.map(renderBookCard).join('');
    }
  }

  function setFilterGenre(genre) {
    selectedGenre = genre;
    renderHome();
  }

  function setSearchQuery(query) {
    searchQuery = query;
    renderHome();
  }

  // Render Story Detail Page
  function renderStoryDetail(storyId) {
    const stories = getStories();
    const story = stories.find(s => s.id === storyId);
    const container = document.getElementById('view-story-detail');
    if (!story || !container) return;

    const chapters = getChapters(storyId);
    const bookmarked = isBookmarked(story.id);
    const liked = isLiked(story.id);
    const firstChapterNum = chapters[0]?.chapterNumber || 1;

    // Load comments
    const storyComments = FableFlow.Backend?.isReady()
      ? FableFlow.Backend.getComments(storyId)
      : JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]').filter(c => c.storyId === storyId);

    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <button class="btn-secondary" onclick="FableFlow.Navigation.navigateTo('home')" style="padding: 6px 14px; font-size: 0.8rem;">
          ← Back to Catalog
        </button>
      </div>

      <div class="card story-detail-grid">
        <div>
          <img src="${safeImageUrl(story.coverImage)}" class="story-detail-cover" alt="" />
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button class="btn-secondary" style="flex: 1;" onclick="FableFlow.Stories.handleDetailLike('${story.id}')">
              ❤️ <span id="detail-likes-count">${story.likes || 0}</span> Votes
            </button>
            <button class="btn-secondary" style="flex: 1;" onclick="FableFlow.Stories.handleDetailBookmark('${story.id}')">
              🔖 <span id="detail-bookmark-text">${bookmarked ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div>
            <span style="font-size: 0.75rem; font-weight: 800; color: var(--color-primary); text-transform: uppercase;">
              ${escapeHtml(story.genre)}
            </span>
            <h1 style="font-size: 2rem; font-weight: 900; line-height: 1.2; margin: 4px 0 8px 0;">
              ${escapeHtml(story.title)}
            </h1>
            <p style="font-size: 0.85rem; color: var(--text-muted); cursor: pointer;" 
               onclick="FableFlow.Navigation.navigateTo('author-profile', { id: '${story.authorId}' })">
              by <strong style="color: var(--text-main);">${escapeHtml(story.authorName)}</strong>
            </p>
          </div>

          <div style="display: flex; gap: 20px; font-size: 0.82rem; color: var(--text-muted); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); padding: 10px 0;">
            <span>👁️ <strong>${(story.reads || 0).toLocaleString()}</strong> Reads</span>
            <span>❤️ <strong>${story.likes || 0}</strong> Votes</span>
            <span>📖 <strong>${chapters.length}</strong> Chapters</span>
          </div>

          <div>
            <h4 style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">Synopsis</h4>
            <p style="font-size: 0.95rem; line-height: 1.6; white-space: pre-line;">${escapeHtml(story.description)}</p>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${(story.tags || []).map(t => `<span style="font-size: 0.75rem; background: var(--bg-elevated); padding: 4px 10px; border-radius: 6px;">#${escapeHtml(t)}</span>`).join('')}
          </div>

          <div style="margin-top: 12px;">
            <button class="btn-primary" style="font-size: 1rem; padding: 12px 28px;"
                    onclick="FableFlow.Navigation.navigateTo('story-reader', { id: '${story.id}', ch: ${firstChapterNum} })">
              ▶ Start Reading Chapter 1
            </button>
          </div>
        </div>
      </div>

      <!-- Table of Contents -->
      <div class="card" style="margin-top: 32px;">
        <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 16px;">Table of Contents (${chapters.length} Chapters)</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${chapters.map(ch => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 8px; background: var(--bg-elevated); cursor: pointer;"
                 onclick="FableFlow.Navigation.navigateTo('story-reader', { id: '${story.id}', ch: ${ch.chapterNumber} })">
              <div>
                <strong style="font-size: 0.9rem;">Chapter ${ch.chapterNumber}: ${escapeHtml(ch.title)}</strong>
                <p style="font-size: 0.75rem; color: var(--text-muted);">${ch.wordCount || 0} words</p>
              </div>
              <span style="font-size: 0.82rem; font-weight: 700; color: var(--color-primary);">Read →</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Comments Section -->
      <div class="card" style="margin-top: 32px;">
        <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 16px;">Reader Comments</h3>
        <form id="detail-comment-form" onsubmit="event.preventDefault(); FableFlow.Stories.postComment('${story.id}');" style="display: flex; gap: 10px; margin-bottom: 20px;">
          <input type="text" id="detail-comment-input" class="search-input" placeholder="Share your constructive critique or feedback..." style="flex: 1;" required />
          <button type="submit" class="btn-primary">Post</button>
        </form>

        <div id="detail-comments-list" style="display: flex; flex-direction: column; gap: 12px;">
          ${storyComments.map(c => `
            <div style="padding: 12px; border-radius: 8px; background: var(--bg-elevated); font-size: 0.85rem;">
              <strong style="color: var(--color-secondary);">${escapeHtml(c.username)}</strong>
              <p style="margin-top: 4px; line-height: 1.4;">${escapeHtml(c.content)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  async function handleDetailLike(storyId) {
    const res = await toggleLike(storyId);
    const countEl = document.getElementById('detail-likes-count');
    if (countEl) countEl.textContent = res.likes;
    const homeCard = document.querySelector(`[data-story-likes="${CSS.escape(storyId)}"]`);
    if (homeCard) homeCard.textContent = res.likes;
  }

  async function handleDetailBookmark(storyId) {
    const isNowBookmarked = await toggleBookmark(storyId);
    const textEl = document.getElementById('detail-bookmark-text');
    if (textEl) textEl.textContent = isNowBookmarked ? 'Saved' : 'Save';
  }

  function postComment(storyId) {
    if (window.FableFlow.Auth) {
      window.FableFlow.Auth.requireAuth('comment on stories', () => actuallyPostComment(storyId));
    } else {
      actuallyPostComment(storyId);
    }
  }

  function actuallyPostComment(storyId) {
    const input = document.getElementById('detail-comment-input');
    if (!input || !input.value.trim()) return;
    const content = input.value.trim();
    if (FableFlow.Backend?.isReady()) {
      FableFlow.Backend.addComment(storyId, content).then(() => {
        input.value = '';
        renderStoryDetail(storyId);
      }).catch(error => console.error('Could not post comment', error));
      return;
    }

    const user = FableFlow.Auth.getCurrentUser();
    const all = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]');
    all.unshift({ id: `cmt_${Date.now()}`, storyId, username: user?.username || 'Reader', content, createdAt: new Date().toISOString() });
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
    input.value = '';
    renderStoryDetail(storyId);
  }

  // ========================================================
  // TEXT-TO-SPEECH (TTS) STORY NARRATION ENGINE (Web Speech API)
  // ========================================================
  const TTS = (function() {
    const SPEED_KEY = 'fableflow_tts_speed';
    let chunks = [];
    let currentChunkIndex = 0;
    let status = 'Stopped'; // 'Stopped', 'Playing', 'Paused'
    let currentSpeed = parseFloat(localStorage.getItem(SPEED_KEY) || '1.0');
    let synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    let activeUtterance = null;
    let currentStoryId = null;
    let currentChapterNum = null;

    function isSupported() {
      return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    }

    function splitIntoChunks(htmlText) {
      if (!htmlText) return [];
      const temp = document.createElement('div');
      temp.innerHTML = htmlText;
      const clean = (temp.textContent || temp.innerText || '').replace(/\s+/g, ' ').trim();
      if (!clean) return [];

      // Split into natural sentences / punctuation chunks (~180-240 characters)
      // Prevents browser speech synthesis pauses/freezes on long texts
      const regex = /[^.!?]+[.!?]+|\S+/g;
      const rawSentences = clean.match(regex) || [clean];
      const result = [];
      let buffer = '';

      for (let s of rawSentences) {
        s = s.trim();
        if (!s) continue;
        if (buffer.length + s.length < 220) {
          buffer = buffer ? (buffer + ' ' + s) : s;
        } else {
          if (buffer) result.push(buffer);
          buffer = s;
        }
      }
      if (buffer) result.push(buffer);
      return result;
    }

    function initPlayer(storyId, chapterNum, chapterContent) {
      if (currentStoryId !== storyId || currentChapterNum !== chapterNum) {
        stop();
      }
      currentStoryId = storyId;
      currentChapterNum = chapterNum;
      chunks = splitIntoChunks(chapterContent);
      currentChunkIndex = 0;

      if (!isSupported()) {
        const alertEl = document.getElementById('tts-unsupported-msg');
        if (alertEl) alertEl.style.display = 'block';
        const playBtn = document.getElementById('tts-play-btn');
        if (playBtn) playBtn.disabled = true;
        return;
      }

      updateUI();
    }

    function play() {
      if (!isSupported() || chunks.length === 0) return;
      if (synth) synth.cancel();

      status = 'Playing';
      currentChunkIndex = 0;
      updateUI();
      speakCurrentChunk();
    }

    function speakCurrentChunk() {
      if (status !== 'Playing') return;
      if (currentChunkIndex >= chunks.length) {
        status = 'Stopped';
        currentChunkIndex = 0;
        updateUI();
        return;
      }

      const text = chunks[currentChunkIndex];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = currentSpeed;
      activeUtterance = utterance;

      utterance.onend = () => {
        if (status === 'Playing') {
          currentChunkIndex++;
          speakCurrentChunk();
        }
      };

      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        console.warn('TTS error', e);
        if (status === 'Playing') {
          currentChunkIndex++;
          speakCurrentChunk();
        }
      };

      synth.speak(utterance);
      updateUI();
    }

    function pause() {
      if (status !== 'Playing') return;
      status = 'Paused';
      if (synth) {
        synth.cancel(); // Cancel current utterance cleanly, currentChunkIndex is preserved!
      }
      updateUI();
    }

    function resume() {
      if (status !== 'Paused') return;
      status = 'Playing';
      updateUI();
      speakCurrentChunk();
    }

    function stop() {
      status = 'Stopped';
      currentChunkIndex = 0;
      if (synth) {
        synth.cancel();
      }
      updateUI();
    }

    function setSpeed(speed) {
      currentSpeed = parseFloat(speed) || 1.0;
      localStorage.setItem(SPEED_KEY, currentSpeed.toString());

      if (status === 'Playing') {
        if (synth) synth.cancel();
        speakCurrentChunk();
      }
    }

    function updateUI() {
      const statusBadge = document.getElementById('tts-status-badge');
      const playBtn = document.getElementById('tts-play-btn');
      const pauseBtn = document.getElementById('tts-pause-btn');
      const resumeBtn = document.getElementById('tts-resume-btn');
      const stopBtn = document.getElementById('tts-stop-btn');
      const speedSelect = document.getElementById('tts-speed-select');

      if (statusBadge) {
        statusBadge.textContent = `Status: ${status}`;
        statusBadge.setAttribute('data-status', status.toLowerCase());
      }

      if (speedSelect) {
        speedSelect.value = currentSpeed.toString();
      }

      if (playBtn) playBtn.disabled = (status === 'Playing');
      if (pauseBtn) pauseBtn.disabled = (status !== 'Playing');
      if (resumeBtn) resumeBtn.disabled = (status !== 'Paused');
      if (stopBtn) stopBtn.disabled = (status === 'Stopped');
    }

    return {
      isSupported,
      initPlayer,
      play,
      pause,
      resume,
      stop,
      setSpeed,
      getStatus: () => status,
      getSpeed: () => currentSpeed
    };
  })();

  // Render Story Reader Page (Distraction-Free Reading)
  function renderStoryReader(storyId, chapterNum) {
    const stories = getStories();
    const story = stories.find(s => s.id === storyId);
    const container = document.getElementById('view-story-reader');
    if (!story || !container) return;

    const chapters = getChapters(storyId);
    const chNum = Number(chapterNum) || 1;
    const currentChapter = chapters.find(c => c.chapterNumber === chNum) || chapters[0];

    saveReadingProgress(storyId, currentChapter ? currentChapter.chapterNumber : 1);

    const prevChap = chapters.find(c => c.chapterNumber === chNum - 1);
    const nextChap = chapters.find(c => c.chapterNumber === chNum + 1);

    container.innerHTML = `
      <div class="reader-toolbar">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="FableFlow.Navigation.navigateTo('story-detail', { id: '${story.id}' })">
            ← Overview
          </button>
          <div>
            <h4 style="font-size: 0.85rem; font-weight: 800;">${escapeHtml(story.title)}</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(currentChapter.title)}</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="icon-btn" onclick="FableFlow.Accessibility.setFontSize(Math.max(14, FableFlow.Accessibility.getPreferences().fontSize - 1))" title="Decrease font size">A-</button>
          <button class="icon-btn" onclick="FableFlow.Accessibility.setFontSize(Math.min(24, FableFlow.Accessibility.getPreferences().fontSize + 1))" title="Increase font size">A+</button>
          <button class="icon-btn" onclick="FableFlow.Stories.handleDetailBookmark('${story.id}')" title="Bookmark story">🔖</button>
        </div>

        <div class="reader-progress-bar" id="reader-scroll-progress"></div>
      </div>

      <div class="reader-prose-container">
        <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid var(--border-color);">
          <span style="font-size: 0.75rem; font-weight: 800; color: var(--color-primary); text-transform: uppercase;">
            Chapter ${currentChapter.chapterNumber}
          </span>
          <h1 style="font-size: 2.2rem; font-weight: 900; margin: 8px 0;">${escapeHtml(currentChapter.title)}</h1>
          <p style="font-size: 0.8rem; color: var(--text-muted);">
            by ${escapeHtml(story.authorName)} • ~${Math.ceil((currentChapter.wordCount || 200) / 200)} min read
          </p>
        </div>

        <!-- Compact Audio Narration Player (Web Speech API) -->
        <div class="reader-tts-player" id="reader-tts-player" role="region" aria-label="Story Audio Narration Player">
          <div class="tts-header">
            <div class="tts-title-wrap">
              <span class="tts-icon">🔊</span>
              <div>
                <strong class="tts-label">Story Narration (Text-to-Speech)</strong>
                <span class="tts-status-badge" id="tts-status-badge" data-status="stopped">Status: Stopped</span>
              </div>
            </div>
            <div class="tts-speed-wrap">
              <label for="tts-speed-select" class="tts-speed-label">Speed:</label>
              <select id="tts-speed-select" class="tts-speed-select" aria-label="Narration Speed" onchange="FableFlow.Stories.TTS.setSpeed(this.value)">
                <option value="0.75">0.75x</option>
                <option value="1.0" selected>1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="1.75">1.75x</option>
                <option value="2.0">2.0x</option>
              </select>
            </div>
          </div>
          <div class="tts-controls">
            <button type="button" class="btn-tts" id="tts-play-btn" onclick="FableFlow.Stories.TTS.play()" title="Play narration" aria-label="Play narration">
              ▶ Play
            </button>
            <button type="button" class="btn-tts" id="tts-pause-btn" onclick="FableFlow.Stories.TTS.pause()" title="Pause narration" aria-label="Pause narration" disabled>
              ⏸ Pause
            </button>
            <button type="button" class="btn-tts" id="tts-resume-btn" onclick="FableFlow.Stories.TTS.resume()" title="Resume narration" aria-label="Resume narration" disabled>
              ⏯ Resume
            </button>
            <button type="button" class="btn-tts" id="tts-stop-btn" onclick="FableFlow.Stories.TTS.stop()" title="Stop narration" aria-label="Stop narration" disabled>
              ⏹ Stop
            </button>
          </div>
          <div id="tts-unsupported-msg" class="tts-alert" style="display: none;">
            ⚠️ Text-to-Speech is not supported in this browser.
          </div>
        </div>

        <div class="reader-prose" id="reader-chapter-body">
          ${escapeHtml(currentChapter.content)}
        </div>

        <!-- Next / Prev Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 48px; padding-top: 24px; border-top: 2px solid var(--border-color);">
          ${prevChap ? `
            <button class="btn-secondary" onclick="FableFlow.Navigation.navigateTo('story-reader', { id: '${story.id}', ch: ${prevChap.chapterNumber} })">
              ← Chapter ${prevChap.chapterNumber}
            </button>
          ` : '<div></div>'}

          <button class="btn-secondary" onclick="FableFlow.Navigation.navigateTo('story-detail', { id: '${story.id}' })">
            Directory
          </button>

          ${nextChap ? `
            <button class="btn-primary" onclick="FableFlow.Navigation.navigateTo('story-reader', { id: '${story.id}', ch: ${nextChap.chapterNumber} })">
              Chapter ${nextChap.chapterNumber} →
            </button>
          ` : '<span style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">You have reached the latest chapter!</span>'}
        </div>
      </div>
    `;

    // Initialize TTS audio narration for this chapter
    TTS.initPlayer(story.id, currentChapter.chapterNumber, currentChapter.content);

    // Hook scroll progress bar
    window.onscroll = function() {
      const bar = document.getElementById('reader-scroll-progress');
      if (bar) {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
        bar.style.width = `${Math.min(100, progress)}%`;
      }
    };
  }

  // Text selection popover for reading assistance
  function bindReaderEvents() {
    document.addEventListener('mouseup', () => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';
      const popover = document.getElementById('reader-selection-popover');

      if (text && text.length > 1 && text.length < 300 && window.FableFlow.Navigation.getCurrentView() === 'story-reader') {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (popover) {
          popover.style.display = 'block';
          popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
          popover.style.left = `${Math.max(10, rect.left + rect.width / 2 - 140)}px`;
          popover.setAttribute('data-selected-text', text);
          const preview = document.getElementById('selection-popover-text');
          if (preview) preview.textContent = `"${text}"`;
        }
      }
    });

    document.addEventListener('mousedown', (e) => {
      const popover = document.getElementById('reader-selection-popover');
      if (popover && !popover.contains(e.target)) {
        popover.style.display = 'none';
      }
    });
  }

  // Render Dashboard
  function renderDashboard() {
    const stories = getStories();
    const user = FableFlow.Auth.getCurrentUser();
    const myStories = stories.filter(s => user ? s.authorId === user.id : s.authorId === 'usr_author_1');
    const myPublished = myStories.filter(s => s.status === 'published');
    const myDrafts = myStories.filter(s => s.status === 'draft');

    const totalReads = myStories.reduce((acc, s) => acc + (s.reads || 0), 0);
    const totalLikes = myStories.reduce((acc, s) => acc + (s.likes || 0), 0);

    const bookmarkedIds = getBookmarks();
    const savedStories = stories.filter(s => bookmarkedIds.includes(s.id));

    const contProg = getReadingProgress();
    const currentlyReadingStory = contProg ? stories.find(s => s.id === contProg.storyId) : null;

    const writerContainer = document.getElementById('dashboard-writer-content');
    const readerContainer = document.getElementById('dashboard-reader-content');

    if (writerContainer) {
      writerContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; margin-bottom: 24px;">
          <div class="card" style="padding: 16px; text-align: center;">
            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">TOTAL READS</span>
            <p style="font-size: 1.6rem; font-weight: 900; color: var(--color-primary);">${totalReads.toLocaleString()}</p>
          </div>
          <div class="card" style="padding: 16px; text-align: center;">
            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">TOTAL VOTES</span>
            <p style="font-size: 1.6rem; font-weight: 900; color: var(--color-accent);">${totalLikes.toLocaleString()}</p>
          </div>
          <div class="card" style="padding: 16px; text-align: center;">
            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">PUBLISHED</span>
            <p style="font-size: 1.6rem; font-weight: 900;">${myPublished.length}</p>
          </div>
          <div class="card" style="padding: 16px; text-align: center;">
            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">DRAFTS</span>
            <p style="font-size: 1.6rem; font-weight: 900; color: var(--color-secondary);">${myDrafts.length}</p>
          </div>
        </div>

        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 1.1rem; font-weight: 800;">My Manuscripts</h3>
            <button class="btn-primary" onclick="FableFlow.Navigation.navigateTo('post')">+ Write New Story</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${myStories.map(st => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 8px; background: var(--bg-elevated); gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="${safeImageUrl(st.coverImage)}" style="width: 36px; height: 50px; border-radius: 4px; object-fit: cover;" alt="" />
                  <div>
                    <strong style="font-size: 0.9rem;">${escapeHtml(st.title)}</strong>
                    <p style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(st.genre)} • ${(st.reads || 0).toLocaleString()} reads • Status: <strong>${escapeHtml(st.status)}</strong></p>
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="FableFlow.Navigation.navigateTo('post', { storyId: '${st.id}' })">Edit in Studio</button>
                  <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="FableFlow.Navigation.navigateTo('story-detail', { id: '${st.id}' })">View</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (readerContainer) {
      readerContainer.innerHTML = `
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 12px;">Currently Reading</h3>
          ${currentlyReadingStory ? `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-elevated); border-radius: 8px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <img src="${safeImageUrl(currentlyReadingStory.coverImage)}" style="width: 44px; height: 60px; border-radius: 4px; object-fit: cover;" alt="" />
                <div>
                  <strong>${escapeHtml(currentlyReadingStory.title)}</strong>
                  <p style="font-size: 0.75rem; color: var(--text-muted);">Chapter ${contProg.chapterNum} • by ${escapeHtml(currentlyReadingStory.authorName)}</p>
                </div>
              </div>
              <button class="btn-primary" onclick="FableFlow.Navigation.navigateTo('story-reader', { id: '${currentlyReadingStory.id}', ch: ${contProg.chapterNum} })">
                Resume
              </button>
            </div>
          ` : '<p style="font-size: 0.85rem; color: var(--text-muted);">No active reading sessions.</p>'}
        </div>

        <div class="card">
          <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 16px;">Saved Bookmarks (${savedStories.length})</h3>
          <div class="story-grid">
            ${savedStories.map(renderBookCard).join('')}
          </div>
        </div>
      `;
    }
  }

  // Render Author Profile
  function renderAuthorProfile(authorId) {
    const stories = getStories();
    const profiles = FableFlow.Backend?.isReady() ? FableFlow.Backend.getProfiles() : JSON.parse(localStorage.getItem('fableflow_users') || '[]');
    const profile = profiles.find(row => row.id === authorId);
    const author = profile ? {
      ...profile,
      avatar: profile.avatar_url || profile.avatar,
      followersCount: profile.id === 'usr_author_1' ? 1420 : profile.id === 'usr_author_2' ? 950 : 0
    } : {
      id: authorId,
      username: 'FableFlow Author',
      bio: '',
      avatar: ''
    };

    const authorStories = stories.filter(s => s.authorId === author.id);
    author.totalReads = authorStories.reduce((total, story) => total + Number(story.reads || 0), 0);
    const container = document.getElementById('view-author-profile');
    if (!container) return;

    const follows = FableFlow.Backend?.isReady()
      ? FableFlow.Backend.getFollows()
      : JSON.parse(localStorage.getItem(FOLLOWS_KEY) || '[]');
    const isFollowing = follows.includes(author.id);

    container.innerHTML = `
      <div class="card" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 32px;">
        <div style="display: flex; align-items: center; gap: 20px;">
          <img src="${safeImageUrl(author.avatar)}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--color-primary);" alt="" />
          <div>
            <h2 style="font-size: 1.6rem; font-weight: 900;">${escapeHtml(author.username)}</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 500px; margin-top: 4px;">${escapeHtml(author.bio || '')}</p>
            <div style="display: flex; gap: 16px; font-size: 0.8rem; margin-top: 8px;">
              <span><strong>${author.followersCount + (isFollowing ? 1 : 0)}</strong> Followers</span>
              <span><strong>${authorStories.length}</strong> Stories</span>
              <span><strong>${(author.totalReads || 0).toLocaleString()}</strong> Reads</span>
            </div>
          </div>
        </div>

        <button class="${isFollowing ? 'btn-secondary' : 'btn-primary'}" onclick="FableFlow.Stories.toggleFollowAuthor('${author.id}')">
          ${isFollowing ? '✓ Following' : '+ Follow Author'}
        </button>
      </div>

      <div class="section-header">
        <h3 class="section-title">Stories by ${escapeHtml(author.username)}</h3>
      </div>
      <div class="story-grid">
        ${authorStories.map(renderBookCard).join('')}
      </div>
    `;
  }

  function toggleFollowAuthor(authorId) {
    if (window.FableFlow.Auth) {
      window.FableFlow.Auth.requireAuth('follow authors', () => actuallyToggleFollowAuthor(authorId));
    } else {
      actuallyToggleFollowAuthor(authorId);
    }
  }

  async function actuallyToggleFollowAuthor(authorId) {
    if (FableFlow.Backend?.isReady()) {
      try {
        await FableFlow.Backend.toggleFollow(authorId);
        renderAuthorProfile(authorId);
      } catch (error) {
        console.error('Could not update author follow', error);
      }
      return;
    }
    let follows = JSON.parse(localStorage.getItem(FOLLOWS_KEY) || '[]');
    if (follows.includes(authorId)) {
      follows = follows.filter(id => id !== authorId);
    } else {
      follows.push(authorId);
    }
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify(follows));
    renderAuthorProfile(authorId);
  }

  function bindHomeEvents() {
    const searchInput = document.getElementById('home-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        setSearchQuery(e.target.value);
      });
    }
  }

  return {
    init,
    renderHome,
    renderStoryDetail,
    renderStoryReader,
    renderDashboard,
    renderAuthorProfile,
    toggleBookmark,
    toggleLike,
    handleDetailLike,
    handleDetailBookmark,
    postComment,
    toggleFollowAuthor,
    setFilterGenre,
    setSearchQuery,
    getStories,
    getChapters,
    TTS
  };
})();
